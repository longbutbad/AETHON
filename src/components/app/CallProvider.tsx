"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type CallPeer = { id: string; name: string; avatar: string | null };

type CallState = "idle" | "calling" | "incoming" | "in-call";

type Ctx = { startCall: (peer: CallPeer) => void; state: CallState };
const CallContext = createContext<Ctx>({ startCall: () => {}, state: "idle" });
export const useCall = () => useContext(CallContext);

// Public STUN servers. Works on the same network / localhost. Reliable calls
// across the open internet also need a TURN relay (paid) — noted in the README.
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

type Signal =
  | { kind: "ring"; from: CallPeer; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; from: string; candidate: RTCIceCandidateInit }
  | { kind: "end"; from: string };

export default function CallProvider({
  me,
  children,
}: {
  me: CallPeer;
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const [state, setState] = useState<CallState>("idle");
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [connected, setConnected] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (peerChannelRef.current) {
      supabase.removeChannel(peerChannelRef.current);
      peerChannelRef.current = null;
    }
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    setState("idle");
    setPeer(null);
    setConnected(false);
    setMicOn(true);
    setCamOn(true);
  }, [supabase]);

  // Open (or reuse) a broadcast channel to a peer's inbox for sending signals.
  const peerChannel = useCallback(
    (peerId: string) => {
      if (peerChannelRef.current) return peerChannelRef.current;
      const ch = supabase.channel(`call:${peerId}`, {
        config: { broadcast: { self: false } },
      });
      ch.subscribe();
      peerChannelRef.current = ch;
      return ch;
    },
    [supabase],
  );

  const send = useCallback(
    (peerId: string, signal: Signal) => {
      peerChannel(peerId).send({ type: "broadcast", event: "signal", payload: signal });
    },
    [peerChannel],
  );

  // Build a peer connection wired to local media + signaling.
  const makePc = useCallback(
    async (target: CallPeer) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        // Stash the stream; the effect below attaches it once the <video> mounts.
        remoteStreamRef.current = e.streams[0];
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        setConnected(true);
        setState("in-call");
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) send(target.id, { kind: "ice", from: me.id, candidate: e.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          // give it a moment for reconnection, then drop
          if (pc.connectionState === "failed") hangUp(false);
        }
      };
      return pc;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me.id, send],
  );

  // ── Outgoing ───────────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (target: CallPeer) => {
      if (state !== "idle") return;
      setPeer(target);
      setState("calling");
      try {
        const pc = await makePc(target);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send(target.id, { kind: "ring", from: me, sdp: offer });
      } catch (err) {
        console.error("Could not start call:", err);
        cleanup();
        alert("Couldn't access your mic/camera. Check browser permissions.");
      }
    },
    [state, makePc, send, me, cleanup],
  );

  // ── Incoming: accept / decline ──────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const target = peer;
    const offer = pendingOfferRef.current;
    if (!target || !offer) return;
    try {
      const pc = await makePc(target);
      await pc.setRemoteDescription(offer);
      for (const c of pendingIceRef.current) await pc.addIceCandidate(c).catch(() => {});
      pendingIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send(target.id, { kind: "answer", from: me.id, sdp: answer });
      setState("in-call");
    } catch (err) {
      console.error("Could not accept call:", err);
      cleanup();
      alert("Couldn't access your mic/camera. Check browser permissions.");
    }
  }, [peer, makePc, send, me.id, cleanup]);

  const hangUp = useCallback(
    (notify = true) => {
      if (notify && peer) send(peer.id, { kind: "end", from: me.id });
      cleanup();
    },
    [peer, send, me.id, cleanup],
  );

  // ── Signaling inbox ─────────────────────────────────────────────────────────
  useEffect(() => {
    const inbox = supabase
      .channel(`call:${me.id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        const sig = payload as Signal;
        const pc = pcRef.current;

        if (sig.kind === "ring") {
          if (pcRef.current || state !== "idle") {
            // busy — auto-decline
            send(sig.from.id, { kind: "end", from: me.id });
            return;
          }
          pendingOfferRef.current = sig.sdp;
          setPeer(sig.from);
          setState("incoming");
        } else if (sig.kind === "answer") {
          pc?.setRemoteDescription(sig.sdp).catch((e) => console.error(e));
        } else if (sig.kind === "ice") {
          if (pc && pc.remoteDescription) pc.addIceCandidate(sig.candidate).catch(() => {});
          else pendingIceRef.current.push(sig.candidate);
        } else if (sig.kind === "end") {
          cleanup();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(inbox);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id, state]);

  // Attach local + remote streams to their <video> elements whenever the call
  // view (re)mounts. This is what makes you actually see/hear the other person —
  // ontrack can fire before the element exists, so we re-attach here.
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play?.().catch(() => {});
    }
  }, [state, connected]);

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  return (
    <CallContext.Provider value={{ startCall, state }}>
      {children}
      {state !== "idle" && (
        <CallOverlay
          state={state}
          peer={peer}
          connected={connected}
          micOn={micOn}
          camOn={camOn}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          onAccept={acceptCall}
          onDecline={() => hangUp(true)}
          onHangUp={() => hangUp(true)}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
        />
      )}
    </CallContext.Provider>
  );
}

function Avatar({ peer, size }: { peer: CallPeer | null; size: number }) {
  const initials = (peer?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-deep to-cyan-deep font-bold text-white"
      style={{ width: size, height: size, fontSize: size / 3 }}
    >
      {peer?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={peer.avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

function CallOverlay({
  state,
  peer,
  connected,
  micOn,
  camOn,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onDecline,
  onHangUp,
  onToggleMic,
  onToggleCam,
}: {
  state: CallState;
  peer: CallPeer | null;
  connected: boolean;
  micOn: boolean;
  camOn: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onAccept: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
}) {
  // Small ringing card for incoming/outgoing before connection.
  if (state === "incoming" || (state === "calling" && !connected)) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#0b0a16] p-6 text-center">
          <div className="mx-auto mb-3 w-fit">
            <Avatar peer={peer} size={72} />
          </div>
          <div className="font-display text-lg font-bold text-gray-50">{peer?.name}</div>
          <div className="mb-5 text-sm text-gray-500">
            {state === "incoming" ? "Incoming call…" : "Calling…"}
          </div>
          <div className="flex justify-center gap-3">
            {state === "incoming" && (
              <button
                onClick={onAccept}
                className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
              >
                Accept
              </button>
            )}
            <button
              onClick={onDecline}
              className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600"
            >
              {state === "incoming" ? "Decline" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // In-call video view.
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="relative flex-1">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full bg-black object-contain"
        />
        {!connected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Avatar peer={peer} size={80} />
            <span>Connecting to {peer?.name}…</span>
          </div>
        )}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 h-32 w-24 rounded-lg border border-white/20 bg-black object-cover sm:h-40 sm:w-32"
        />
      </div>
      <div className="flex items-center justify-center gap-4 bg-[#0b0a16] py-4">
        <button
          onClick={onToggleMic}
          className={
            "flex h-12 w-12 items-center justify-center rounded-full text-xl " +
            (micOn ? "bg-white/10 text-white" : "bg-red-500 text-white")
          }
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? "🎤" : "🔇"}
        </button>
        <button
          onClick={onToggleCam}
          className={
            "flex h-12 w-12 items-center justify-center rounded-full text-xl " +
            (camOn ? "bg-white/10 text-white" : "bg-red-500 text-white")
          }
          title={camOn ? "Camera off" : "Camera on"}
        >
          {camOn ? "📹" : "🚫"}
        </button>
        <button
          onClick={onHangUp}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-xl text-white"
          title="Hang up"
        >
          📞
        </button>
      </div>
    </div>
  );
}

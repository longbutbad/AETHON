"use client";

import { useEffect, useMemo, useState } from "react";

const GAMES = [
  { id: "ttt", name: "Tic-Tac-Toe", glyph: "⭕", desc: "Beat the CPU." },
  { id: "memory", name: "Memory Match", glyph: "🧠", desc: "Find all the pairs." },
] as const;

type GameId = (typeof GAMES)[number]["id"];

export default function GamesHub() {
  const [game, setGame] = useState<GameId | null>(null);

  if (game) {
    return (
      <div>
        <button
          onClick={() => setGame(null)}
          className="mb-4 text-sm font-semibold text-violet-light"
        >
          ‹ All games
        </button>
        {game === "ttt" && <TicTacToe />}
        {game === "memory" && <MemoryMatch />}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {GAMES.map((g) => (
        <button
          key={g.id}
          onClick={() => setGame(g.id)}
          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left transition hover:bg-white/5"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet/15 text-2xl">
            {g.glyph}
          </span>
          <div>
            <div className="font-display text-sm font-bold text-gray-100">{g.name}</div>
            <div className="text-[11px] text-gray-500">{g.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Tic-Tac-Toe (you = X, CPU = O) ──────────────────────────────────────── */

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winner(b: (string | null)[]) {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

function cpuMove(b: (string | null)[]) {
  const empty = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  // Win if possible, then block, then center, corner, random.
  for (const i of empty) {
    const t = b.slice();
    t[i] = "O";
    if (winner(t) === "O") return i;
  }
  for (const i of empty) {
    const t = b.slice();
    t[i] = "X";
    if (winner(t) === "X") return i;
  }
  if (b[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((i) => b[i] === null);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

function TicTacToe() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const win = winner(board);
  const full = board.every(Boolean);
  const over = !!win || full;

  const play = (i: number) => {
    if (board[i] || over) return;
    const next = board.slice();
    next[i] = "X";
    if (winner(next) || next.every(Boolean)) {
      setBoard(next);
      return;
    }
    const move = cpuMove(next);
    next[move] = "O";
    setBoard(next);
  };

  const status = win === "X" ? "You win! 🎉" : win === "O" ? "CPU wins 🤖" : full ? "Draw 🤝" : "Your move (X)";

  return (
    <div className="max-w-xs">
      <div className="mb-3 font-display text-sm font-bold tracking-[1px] text-gray-200">{status}</div>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-3xl font-bold hover:bg-white/5"
          >
            <span className={cell === "X" ? "text-violet-light" : "text-cyan-light"}>{cell}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setBoard(Array(9).fill(null))}
        className="mt-3 rounded-lg bg-gradient-to-br from-violet to-cyan px-4 py-2 text-sm font-bold text-white"
      >
        New game
      </button>
    </div>
  );
}

/* ── Memory Match ────────────────────────────────────────────────────────── */

const EMOJIS = ["🎮", "🚀", "🔥", "👾", "🏆", "🎧", "🐉", "💎"];

function shuffled() {
  const cards = [...EMOJIS, ...EMOJIS].map((e, i) => ({ id: i, e }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function MemoryMatch() {
  const [cards, setCards] = useState(shuffled);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const won = matched.size === cards.length;

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    setMoves((m) => m + 1);
    if (cards[a].e === cards[b].e) {
      setMatched((prev) => new Set(prev).add(a).add(b));
      setFlipped([]);
    } else {
      const t = setTimeout(() => setFlipped([]), 700);
      return () => clearTimeout(t);
    }
  }, [flipped, cards]);

  const flip = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.has(i)) return;
    setFlipped((f) => [...f, i]);
  };

  const reset = () => {
    setCards(shuffled());
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
  };

  return (
    <div className="max-w-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-sm font-bold tracking-[1px] text-gray-200">
          {won ? `Solved in ${moves} moves! 🎉` : `Moves: ${moves}`}
        </span>
        <button onClick={reset} className="text-sm font-semibold text-violet-light">
          Restart
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, i) => {
          const show = flipped.includes(i) || matched.has(i);
          return (
            <button
              key={card.id}
              onClick={() => flip(i)}
              className={
                "flex aspect-square items-center justify-center rounded-lg border text-2xl transition " +
                (show
                  ? "border-violet/40 bg-violet/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/5")
              }
            >
              {show ? card.e : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

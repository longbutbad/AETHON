/** Pull an 11-char YouTube video id out of a URL (watch, youtu.be, embed, shorts) or bare id. */
export function extractVideoId(input: string): string | null {
  const s = input.trim();
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(embed|shorts|v)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // not a URL — maybe a bare id
  }
  return /^[\w-]{11}$/.test(s) ? s : null;
}

export function thumbnailUrl(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  dob: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

/** Full name from a profile, falling back to "Operator". */
export function displayName(p: Pick<Profile, "first_name" | "last_name"> | null) {
  if (!p) return "Operator";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Operator";
}

/** Two-letter initials for avatar fallbacks. */
export function initials(p: Pick<Profile, "first_name" | "last_name"> | null) {
  return (
    ((p?.first_name?.[0] ?? "") + (p?.last_name?.[0] ?? "")).toUpperCase() || "?"
  );
}

/** Parse a "DD / MM / YYYY" string into an ISO date, or null if invalid. */
export function parseDob(str: string): string | null {
  const m = str.trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const y = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Format an ISO date as "DD / MM / YYYY" for display. */
export function formatDob(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d} / ${m} / ${y}`;
}

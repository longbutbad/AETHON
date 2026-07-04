import { createClient } from "@/lib/supabase/client";

export type DailyState = {
  xp: number;
  quest_id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  xp_reward: number;
  completed: boolean;
};

/**
 * Report that the user did something quest-worthy. Fire-and-forget: if the stats
 * backend isn't set up yet, it just no-ops.
 */
export async function bumpQuest(action: "message" | "friend" | "game" | "win") {
  try {
    await createClient().rpc("quest_progress", { p_action: action });
  } catch {
    // stats.sql not run yet — ignore.
  }
}

/** XP → level (every 1000 XP is a level) and rank name. */
export function levelInfo(xp: number) {
  const level = Math.floor(xp / 1000) + 1;
  const intoLevel = xp % 1000;
  const rank =
    level >= 20
      ? "Legend"
      : level >= 10
        ? "Veteran"
        : level >= 5
          ? "Operative"
          : level >= 3
            ? "Scout"
            : "Rookie";
  return { level, intoLevel, rank, needed: 1000 };
}

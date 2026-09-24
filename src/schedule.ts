import type { Env } from "./env";
import type { TopicSlug } from "./sources";

// 14 notes a day, one per local hour, 07:00-22:00. Hours 12 and 18 are deliberately quiet.
export const SCHEDULE: Record<number, TopicSlug> = {
  7: "javascript",
  8: "ai",
  9: "react",
  10: "backend",
  11: "ai",
  13: "javascript",
  14: "systemdesign",
  15: "ai",
  16: "react",
  17: "backend",
  19: "javascript",
  20: "ai",
  21: "systemdesign",
  22: "react",
};

export function localHour(env: Env, when: Date): number {
  return new Date(when.getTime() + Number(env.TZ_OFFSET_MINUTES) * 60_000).getUTCHours();
}

export function slotFor(env: Env, when: Date): TopicSlug | null {
  return SCHEDULE[localHour(env, when)] ?? null;
}

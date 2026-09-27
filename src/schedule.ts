import type { Env } from "./env";
import type { TopicSlug } from "./sources";

// 8 notes a day, every second hour from 07:00 to 21:00 local.
export const SCHEDULE: Record<number, TopicSlug> = {
  7: "javascript",
  9: "ai",
  11: "react",
  13: "backend",
  15: "javascript",
  17: "systemdesign",
  19: "ai",
  21: "react",
};

export function localHour(env: Env, when: Date): number {
  return new Date(when.getTime() + Number(env.TZ_OFFSET_MINUTES) * 60_000).getUTCHours();
}

export function slotFor(env: Env, when: Date): TopicSlug | null {
  return SCHEDULE[localHour(env, when)] ?? null;
}

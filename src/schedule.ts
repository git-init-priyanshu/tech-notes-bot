import type { Env } from "./env";
import type { TopicSlug } from "./sources";

// 5 notes a day, one per topic, spaced about five hours apart around the clock.
export const SCHEDULE: Record<number, TopicSlug> = {
  0: "ai",
  5: "javascript",
  10: "react",
  15: "backend",
  20: "systemdesign",
};

export function localHour(env: Env, when: Date): number {
  return new Date(when.getTime() + Number(env.TZ_OFFSET_MINUTES) * 60_000).getUTCHours();
}

export function slotFor(env: Env, when: Date): TopicSlug | null {
  return SCHEDULE[localHour(env, when)] ?? null;
}

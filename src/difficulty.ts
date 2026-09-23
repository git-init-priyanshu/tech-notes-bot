export type Rating = "easy" | "medium" | "hard";

const STEP: Record<Rating, number> = { easy: 0.6, medium: 0.05, hard: -0.5 };

export function isRating(value: string): value is Rating {
  return value === "easy" || value === "medium" || value === "hard";
}

export function nextLevel(current: number, rating: Rating): number {
  return Math.round(Math.min(5, Math.max(1, current + STEP[rating])) * 100) / 100;
}

export const LEVEL_BRIEF: Record<number, string> = {
  1: "Assumes a beginner. Define every term inline, use one concrete analogy, no jargon without a gloss.",
  2: "Assumes a junior engineer who ships features. Explain the mechanism plainly, name the API surface.",
  3: "Assumes a mid-level engineer. Skip definitions of common terms, focus on how it actually works and when to reach for it.",
  4: "Assumes a senior engineer. Go straight to trade-offs, failure modes, and what the naive approach gets wrong.",
  5: "Assumes a staff-level engineer. Internals, edge cases, performance characteristics, and the argument behind the design.",
};

export function briefFor(level: number): string {
  return LEVEL_BRIEF[Math.min(5, Math.max(1, Math.round(level)))];
}

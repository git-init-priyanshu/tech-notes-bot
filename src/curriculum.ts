import type { Env } from "./env";

export interface Chapter {
  id: string;
  position: number;
  title: string;
  url: string;
  textUrl: string;
  source: string;
  format: "html" | "markdown";
  objective: string;
  section?: string[];
  read_at: number | null;
}

export const CURRICULUM_TOPICS = ["ai", "backend", "systemdesign"];

export async function chapterProgress(env: Env, slug: string) {
  const { results: chapters } = await env.DB.prepare(
    `SELECT id, position, title, url, text_url AS textUrl, source, format, objective, sections, read_at
     FROM chapters WHERE topic = ? ORDER BY position ASC`,
  ).bind(slug).all<Omit<Chapter, "section"> & { sections: string | null }>();
  const { results } = await env.DB.prepare(
    `SELECT chapter_id, completed_at, sent_at, days_without_done, explain_count, message_id
     FROM posts WHERE topic = ? AND chapter_id IS NOT NULL AND retired_at IS NULL
     ORDER BY sent_at ASC, id ASC`,
  ).bind(slug).all<{
    chapter_id: string; completed_at: number | null; sent_at: number;
    days_without_done: number; explain_count: number; message_id: number | null;
  }>();
  const offset = Number(env.TZ_OFFSET_MINUTES) * 60_000;
  const today = Math.floor((Date.now() + offset) / 86_400_000);
  return chapters.map((chapter) => {
    const posts = results.filter((post) => post.chapter_id === chapter.id && post.message_id !== null);
    const pending = chapter.read_at === null ? posts.find((post) => post.completed_at === null) : undefined;
    return {
      ...chapter,
      section: chapter.sections ? JSON.parse(chapter.sections) as string[] : undefined,
      completed: chapter.read_at !== null ? 1 : 0,
      current: pending ? 1 : 0,
      seen: 0,
      days_without_done: pending
        ? Math.max(pending.days_without_done, today - Math.floor((pending.sent_at + offset) / 86_400_000))
        : Math.max(0, ...posts.map((post) => post.days_without_done)),
      explain_count: posts.reduce((total, post) => total + post.explain_count, 0),
    };
  });
}

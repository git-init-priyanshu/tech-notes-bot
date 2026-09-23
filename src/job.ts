import type { Env, Topic } from "./env";
import { FEEDS, type TopicSlug } from "./feeds";
import { parseFeed, type FeedItem } from "./rss";
import { summarize } from "./summarize";
import { ratingKeyboard, renderPost, sendPost } from "./telegram";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CANDIDATES_PER_RUN = 6;

interface Candidate extends FeedItem {
  source: string;
}

async function pickTopic(env: Env, slug?: string): Promise<Topic | null> {
  if (slug) {
    return await env.DB.prepare("SELECT * FROM topics WHERE slug = ?").bind(slug).first<Topic>();
  }
  return await env.DB.prepare(
    "SELECT * FROM topics ORDER BY COALESCE(last_sent_at, 0) ASC LIMIT 1",
  ).first<Topic>();
}

async function gatherCandidates(env: Env, topic: Topic): Promise<Candidate[]> {
  const feeds = FEEDS[topic.slug as TopicSlug].filter((feed) => (feed.minLevel ?? 1) <= topic.level + 0.5);
  const fetched = await Promise.allSettled(
    feeds.map(async (feed) => {
      const response = await fetch(feed.url, {
        headers: { "user-agent": "tech-notes-bot/1.0", accept: "application/rss+xml, application/xml, text/xml" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`${feed.url} -> ${response.status}`);
      return parseFeed(await response.text()).map((item) => ({ ...item, source: feed.source }));
    }),
  );

  const cutoff = Date.now() - MAX_AGE_MS;
  const fresh = fetched
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => item.published >= cutoff)
    .sort((a, b) => b.published - a.published)
    .slice(0, 80);

  if (fresh.length === 0) return [];

  const placeholders = fresh.map(() => "?").join(",");
  const { results } = await env.DB.prepare(`SELECT url FROM seen WHERE url IN (${placeholders})`)
    .bind(...fresh.map((item) => item.link))
    .all<{ url: string }>();
  const seen = new Set(results.map((row) => row.url));

  return fresh.filter((item) => !seen.has(item.link));
}

export async function runOnce(env: Env, slug?: string): Promise<string> {
  const topic = await pickTopic(env, slug);
  if (!topic) return "no topic";

  const candidates = await gatherCandidates(env, topic);
  if (candidates.length === 0) return `${topic.slug}: no fresh candidates`;

  for (const candidate of candidates.slice(0, CANDIDATES_PER_RUN)) {
    const note = await summarize(env, topic, candidate, candidate.source);
    await env.DB.prepare("INSERT OR IGNORE INTO seen (url, seen_at) VALUES (?, ?)")
      .bind(candidate.link, Date.now())
      .run();
    if (!note || note.skip) continue;

    const row = await env.DB.prepare(
      `INSERT INTO posts (topic, url, title, source, summary, level, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(topic.slug, candidate.link, candidate.title, candidate.source, note.headline, topic.level, Date.now())
      .first<{ id: number }>();
    if (!row) return "insert failed";

    const messageId = await sendPost(
      env,
      renderPost(topic, note, candidate.source, candidate.link),
      ratingKeyboard(row.id, candidate.link),
    );
    if (messageId === null) return "telegram send failed";

    await env.DB.batch([
      env.DB.prepare("UPDATE posts SET message_id = ? WHERE id = ?").bind(messageId, row.id),
      env.DB.prepare("UPDATE topics SET last_sent_at = ? WHERE slug = ?").bind(Date.now(), topic.slug),
    ]);
    return `${topic.slug}: sent "${note.headline}" (${candidate.source})`;
  }

  return `${topic.slug}: ${candidates.length} candidates, none worth sending`;
}

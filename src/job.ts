import { catalogCandidates } from "./catalog";
import type { Env, Topic } from "./env";
import { parseFeed } from "./rss";
import { SOURCES, type RssSource, type TopicSlug } from "./sources";
import { summarize } from "./summarize";
import { ratingKeyboard, renderPost, sendPost } from "./telegram";

const RECYCLE_AFTER_MS = 90 * 24 * 60 * 60 * 1000;
const CANDIDATES_PER_RUN = 6;

export interface Candidate {
  title: string;
  url: string;
  textUrl: string;
  description: string;
  source: string;
  format: "html" | "markdown";
  published: number;
}

async function pickTopic(env: Env, slug?: string): Promise<Topic | null> {
  if (slug) {
    return await env.DB.prepare("SELECT * FROM topics WHERE slug = ?").bind(slug).first<Topic>();
  }
  return await env.DB.prepare(
    "SELECT * FROM topics ORDER BY COALESCE(last_sent_at, 0) ASC LIMIT 1",
  ).first<Topic>();
}

async function rssCandidates(env: Env, feeds: RssSource[]): Promise<Candidate[]> {
  const fetched = await Promise.allSettled(
    feeds.map(async (feed) => {
      const response = await fetch(feed.url, {
        headers: { "user-agent": "tech-notes-bot/1.0", accept: "application/rss+xml, application/xml, text/xml" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`${feed.url} -> ${response.status}`);
      return parseFeed(await response.text()).map<Candidate>((item) => ({
        title: item.title,
        url: item.link,
        textUrl: item.link,
        description: item.description,
        source: feed.name,
        format: "html",
        published: item.published,
      }));
    }),
  );

  const fresh = fetched
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index)
    .sort((a, b) => b.published - a.published);
  if (fresh.length === 0) return [];

  const placeholders = fresh.map(() => "?").join(",");
  const urls = fresh.map((item) => item.url);
  const { results } = await env.DB.prepare(`SELECT url FROM seen WHERE url IN (${placeholders})`)
    .bind(...urls)
    .all<{ url: string }>();
  let seen = new Set(results.map((row) => row.url));

  if (fresh.every((item) => seen.has(item.url))) {
    await env.DB.prepare(`DELETE FROM seen WHERE seen_at < ? AND url IN (${placeholders})`)
      .bind(Date.now() - RECYCLE_AFTER_MS, ...urls)
      .run();
    const { results: still } = await env.DB.prepare(`SELECT url FROM seen WHERE url IN (${placeholders})`)
      .bind(...urls)
      .all<{ url: string }>();
    seen = new Set(still.map((row) => row.url));
  }

  return fresh.filter((item) => !seen.has(item.url));
}

async function gatherCandidates(env: Env, topic: Topic): Promise<Candidate[]> {
  const sources = SOURCES[topic.slug as TopicSlug] ?? [];
  const catalogs = sources.filter((source) => source.kind === "catalog");
  if (catalogs.length > 0) {
    const gathered = await Promise.all(catalogs.map((source) => catalogCandidates(env, source)));
    return gathered.flat().map((entry) => ({
      title: entry.title,
      url: entry.url,
      textUrl: entry.textUrl,
      description: entry.title,
      source: entry.source,
      format: entry.format,
      published: Date.now(),
    }));
  }

  const feeds = sources.filter(
    (source): source is RssSource => source.kind === "rss" && (source.minLevel ?? 1) <= topic.level + 0.5,
  );
  return await rssCandidates(env, feeds);
}

export async function runOnce(env: Env, slug?: string): Promise<string> {
  const topic = await pickTopic(env, slug);
  if (!topic) return "no topic";

  const candidates = await gatherCandidates(env, topic);
  if (candidates.length === 0) return `${topic.slug}: no fresh candidates`;

  for (const candidate of candidates.slice(0, CANDIDATES_PER_RUN)) {
    const note = await summarize(env, topic, candidate);
    await env.DB.prepare("INSERT OR IGNORE INTO seen (url, seen_at) VALUES (?, ?)")
      .bind(candidate.url, Date.now())
      .run();
    if (!note || note.skip) continue;

    const row = await env.DB.prepare(
      `INSERT INTO posts (topic, url, title, source, summary, level, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(topic.slug, candidate.url, candidate.title, candidate.source, note.headline, topic.level, Date.now())
      .first<{ id: number }>();
    if (!row) return "insert failed";

    const messageId = await sendPost(
      env,
      renderPost(topic, note, candidate.source, candidate.url),
      ratingKeyboard(row.id, candidate.url),
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

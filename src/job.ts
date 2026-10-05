import { catalogCandidates } from "./catalog";
import type { Env, Topic } from "./env";
import { parseFeed } from "./rss";
import { SOURCES, type RssSource, type TopicSlug } from "./sources";
import { summarize, type Note } from "./summarize";
import { lessonKeyboard, renderPost, sendPost } from "./telegram";

const RECYCLE_AFTER_MS = 90 * 24 * 60 * 60 * 1000;
const CANDIDATES_PER_RUN = 6;
// D1 allows at most 100 bound parameters per query, so a url list is always checked in chunks
// that leave room for the other bindings. The pool is capped so a busy topic cannot grow the
// candidate list without bound.
const CANDIDATE_POOL = 240;
const URLS_PER_QUERY = 80;

async function seenUrls(env: Env, urls: string[]): Promise<Set<string>> {
  const seen = new Set<string>();
  for (let start = 0; start < urls.length; start += URLS_PER_QUERY) {
    const chunk = urls.slice(start, start + URLS_PER_QUERY);
    const { results } = await env.DB.prepare(
      `SELECT url FROM seen WHERE url IN (${chunk.map(() => "?").join(",")})`,
    )
      .bind(...chunk)
      .all<{ url: string }>();
    for (const row of results) seen.add(row.url);
  }
  return seen;
}

async function recycleSeen(env: Env, urls: string[]): Promise<void> {
  const cutoff = Date.now() - RECYCLE_AFTER_MS;
  for (let start = 0; start < urls.length; start += URLS_PER_QUERY) {
    const chunk = urls.slice(start, start + URLS_PER_QUERY);
    await env.DB.prepare(
      `DELETE FROM seen WHERE seen_at < ? AND url IN (${chunk.map(() => "?").join(",")})`,
    )
      .bind(cutoff, ...chunk)
      .run();
  }
}

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
    .sort((a, b) => b.published - a.published)
    .slice(0, CANDIDATE_POOL);
  if (fresh.length === 0) return [];

  const urls = fresh.map((item) => item.url);
  let seen = await seenUrls(env, urls);
  if (fresh.every((item) => seen.has(item.url))) {
    await recycleSeen(env, urls);
    seen = await seenUrls(env, urls);
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

  const feeds = sources.filter((source): source is RssSource => source.kind === "rss");
  return await rssCandidates(env, feeds);
}

export async function runOnce(env: Env, slug?: string): Promise<string> {
  const topic = await pickTopic(env, slug);
  if (!topic) return "no topic";

  const pending = await env.DB.prepare(
    `SELECT id, url, title, source, text_url, format, note, sent_at, days_without_done, explain_count FROM posts
     WHERE topic = ? AND completed_at IS NULL AND message_id IS NOT NULL
     ORDER BY sent_at ASC LIMIT 1`,
  ).bind(topic.slug).first<{
    id: number; url: string; title: string; source: string; text_url: string | null;
    format: string | null; note: string | null; sent_at: number;
    days_without_done: number; explain_count: number;
  }>();
  if (pending) {
    const now = Date.now();
    const offset = Number(env.TZ_OFFSET_MINUTES) * 60_000;
    if (topic.last_sent_at !== null &&
        Math.floor((topic.last_sent_at + offset) / 86_400_000) >= Math.floor((now + offset) / 86_400_000)) {
      return `${topic.slug}: finish the current lesson with Done first`;
    }
    if (!pending.note) return `${topic.slug}: unfinished lesson has no saved note`;

    const daysWithoutDone = Math.max(pending.days_without_done,
      Math.floor((now + offset) / 86_400_000) - Math.floor((pending.sent_at + offset) / 86_400_000));
    await env.DB.prepare("UPDATE posts SET days_without_done = ? WHERE id = ? AND completed_at IS NULL")
      .bind(daysWithoutDone, pending.id).run();
    const generated = await summarize(env, topic, {
      title: pending.title,
      url: pending.url,
      textUrl: pending.text_url ?? pending.url,
      description: pending.note,
      source: pending.source,
      format: pending.format === "markdown" ? "markdown" : "html",
      published: pending.sent_at,
    }, {
      mode: "repeat",
      previousNote: pending.note,
      daysWithoutDone,
      explainCount: pending.explain_count,
    });
    const note = generated && !generated.skip ? generated : JSON.parse(pending.note) as Note;
    if (!generated || generated.skip) console.error("simpler explanation failed", topic.slug);
    const current = await env.DB.prepare("SELECT completed_at FROM posts WHERE id = ?")
      .bind(pending.id).first<{ completed_at: number | null }>();
    if (!current || current.completed_at !== null) return `${topic.slug}: lesson already completed`;
    const messageId = await sendPost(
      env,
      renderPost(topic, note, pending.source, pending.url),
      lessonKeyboard(pending.id, pending.url),
    );
    if (messageId === null) return "telegram send failed";

    await env.DB.batch([
      env.DB.prepare("UPDATE posts SET message_id = ?, note = ?, summary = ? WHERE id = ?")
        .bind(messageId, JSON.stringify(note), note.headline, pending.id),
      env.DB.prepare("UPDATE topics SET last_sent_at = ? WHERE slug = ?").bind(now, topic.slug),
    ]);
    return `${topic.slug}: repeated unfinished lesson "${note.headline}"`;
  }

  const isCatalog = SOURCES[topic.slug as TopicSlug]?.some((source) => source.kind === "catalog");
  const candidates = await gatherCandidates(env, topic);
  if (candidates.length === 0) return `${topic.slug}: no fresh candidates`;

  for (const candidate of candidates.slice(0, CANDIDATES_PER_RUN)) {
    const note = await summarize(env, topic, candidate);
    if (!note) {
      if (isCatalog) return `${topic.slug}: lesson generation failed; chapter unchanged`;
      continue;
    }
    if (note.skip) {
      await env.DB.prepare("INSERT OR IGNORE INTO seen (url, seen_at) VALUES (?, ?)")
        .bind(candidate.url, Date.now()).run();
      continue;
    }

    const row = await env.DB.prepare(
      `INSERT INTO posts (topic, url, title, source, summary, text_url, format, note, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(topic.slug, candidate.url, candidate.title, candidate.source, note.headline, candidate.textUrl, candidate.format, JSON.stringify(note), Date.now())
      .first<{ id: number }>();
    if (!row) return "insert failed";

    const messageId = await sendPost(
      env,
      renderPost(topic, note, candidate.source, candidate.url),
      lessonKeyboard(row.id, candidate.url),
    );
    if (messageId === null) {
      await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(row.id).run();
      return "telegram send failed";
    }

    await env.DB.batch([
      env.DB.prepare("UPDATE posts SET message_id = ? WHERE id = ?").bind(messageId, row.id),
      env.DB.prepare("UPDATE topics SET last_sent_at = ? WHERE slug = ?").bind(Date.now(), topic.slug),
    ]);
    return `${topic.slug}: sent "${note.headline}" (${candidate.source})`;
  }

  return `${topic.slug}: ${candidates.length} candidates, none worth sending`;
}

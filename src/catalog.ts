import type { Env } from "./env";
import { decodeEntities } from "./rss";
import type { CatalogSource } from "./sources";

export interface CatalogEntry {
  url: string;
  textUrl: string;
  title: string;
  source: string;
  format: "html" | "markdown";
}

interface CatalogRow {
  url: string;
  text_url: string;
  title: string;
  source: string;
  format: string;
}

const USER_AGENT = "tech-notes-bot/1.0";
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const CANDIDATE_WINDOW = 20;

// The javascript.info home page is the full tutorial map: list-sub__link marks a lesson,
// list__link marks the chapter index above it.
const JS_INFO_ROOT = "https://javascript.info";
const JS_INFO_ARTICLE = /<a class="list-sub__link" href="(\/[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi;

const REACT_LLMS = "https://react.dev/llms.txt";
const REACT_ARTICLE = /^- \[([^\]]+)\]\((https:\/\/react\.dev\/[^)\s]+)\.md\)\s*$/gm;

async function body(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html, text/plain, */*" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return await response.text();
}

function reactArticles(text: string): CatalogEntry[] {
  const found = new Map<string, CatalogEntry>();
  for (const [, title, url] of text.matchAll(REACT_ARTICLE)) {
    if (found.has(url)) continue;
    found.set(url, { url, textUrl: `${url}.md`, title, source: "react.dev", format: "markdown" });
  }
  return [...found.values()];
}

function javascriptInfoArticles(html: string): CatalogEntry[] {
  const found = new Map<string, CatalogEntry>();
  for (const [, path, label] of html.matchAll(JS_INFO_ARTICLE)) {
    const url = `${JS_INFO_ROOT}${path}`;
    const title = decodeEntities(label);
    if (found.has(url) || title.length < 3) continue;
    found.set(url, { url, textUrl: url, title, source: "javascript.info", format: "html" });
  }
  return [...found.values()];
}

async function seed(env: Env, source: CatalogSource): Promise<void> {
  const entries =
    source.discover === "react-llms"
      ? reactArticles(await body(REACT_LLMS))
      : javascriptInfoArticles(await body(`${JS_INFO_ROOT}/`));
  if (entries.length === 0) return;

  const now = Date.now();
  const statement = env.DB.prepare(
    `INSERT OR IGNORE INTO catalog (url, text_url, title, source, format, position, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  await env.DB.batch(
    entries.map((entry, index) =>
      statement.bind(entry.url, entry.textUrl, entry.title, entry.source, entry.format, index, now),
    ),
  );
}

async function unseen(env: Env, source: string): Promise<CatalogEntry[]> {
  const { results } = await env.DB.prepare(
    `SELECT url, text_url, title, source, format FROM catalog
     WHERE source = ? AND url NOT IN (SELECT url FROM seen)
     ORDER BY position ASC LIMIT ?`,
  )
    .bind(source, CANDIDATE_WINDOW)
    .all<CatalogRow>();
  return results.map((row) => ({
    url: row.url,
    textUrl: row.text_url,
    title: row.title,
    source: row.source,
    format: row.format === "markdown" ? "markdown" : "html",
  }));
}

export async function catalogCandidates(env: Env, source: CatalogSource): Promise<CatalogEntry[]> {
  const stored = await env.DB.prepare(
    "SELECT COUNT(*) AS count, COALESCE(MAX(added_at), 0) AS newest FROM catalog WHERE source = ?",
  )
    .bind(source.name)
    .first<{ count: number; newest: number }>();

  if ((stored?.count ?? 0) === 0 || (stored?.newest ?? 0) < Date.now() - REFRESH_AFTER_MS) {
    try {
      await seed(env, source);
    } catch (error) {
      console.error("catalog seed", source.name, String(error));
    }
  }

  const pending = await unseen(env, source.name);
  if (pending.length > 0) return pending;

  // Docs are evergreen: once a source has been read end to end, start the pass over.
  await env.DB.prepare("DELETE FROM seen WHERE url IN (SELECT url FROM catalog WHERE source = ?)")
    .bind(source.name)
    .run();
  return await unseen(env, source.name);
}

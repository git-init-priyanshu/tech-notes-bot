import { catalogCandidates } from "./catalog";
import { chapterProgress, CURRICULUM_TOPICS } from "./curriculum";
import type { Env, Topic } from "./env";
import { runOnce } from "./job";
import { slotFor } from "./schedule";
import { answerCallback, escapeHtml, lessonKeyboard, markCompleted, renderExplanation, sendPlain, sendPost, setWebhook } from "./telegram";
import { summarize } from "./summarize";
import { SOURCES, type TopicSlug } from "./sources";

interface Update {
  message?: { chat: { id: number }; text?: string };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
}

async function handleLesson(env: Env, query: NonNullable<Update["callback_query"]>): Promise<void> {
  if (!query.message || String(query.message.chat.id) !== env.TELEGRAM_CHAT_ID) {
    await answerCallback(env, query.id, "This lesson belongs to another chat.");
    return;
  }

  const [action, id] = (query.data ?? "").split(":");
  if ((action !== "done" && action !== "explain") || !/^\d+$/.test(id ?? "")) {
    await answerCallback(env, query.id, "These buttons are retired. Use /next for the new lesson buttons.");
    return;
  }

  const post = await env.DB.prepare("SELECT * FROM posts WHERE id = ?")
    .bind(Number(id))
    .first<{
      topic: string;
      url: string;
      title: string;
      source: string;
      summary: string;
      text_url: string | null;
      format: string | null;
      note: string | null;
      completed_at: number | null;
      sent_at: number;
      days_without_done: number;
      explain_count: number;
      chapter_id: string | null;
      retired_at: number | null;
    }>();
  if (!post) {
    await answerCallback(env, query.id, "That lesson is gone.");
    return;
  }

  if (post.retired_at !== null) {
    await answerCallback(env, query.id, "This feed lesson is retired. Use /next to start the chapter curriculum.");
    return;
  }

  const now = Date.now();
  const offset = Number(env.TZ_OFFSET_MINUTES) * 60_000;
  const daysWithoutDone = post.completed_at !== null ? post.days_without_done : Math.max(post.days_without_done,
    Math.floor((now + offset) / 86_400_000) - Math.floor((post.sent_at + offset) / 86_400_000));

  if (action === "done") {
    await env.DB.batch([
      env.DB.prepare("UPDATE posts SET completed_at = ?, days_without_done = ? WHERE id = ? AND completed_at IS NULL")
        .bind(now, daysWithoutDone, Number(id)),
      ...(post.chapter_id
        ? [env.DB.prepare("UPDATE chapters SET read_at = ? WHERE id = ? AND read_at IS NULL")
          .bind(now, post.chapter_id)]
        : [env.DB.prepare("INSERT OR IGNORE INTO seen (url, seen_at) VALUES (?, ?)")
          .bind(post.url, now)]),
    ]);
    await answerCallback(env, query.id, post.completed_at !== null
      ? "Already completed."
      : "Completed. The next lesson arrives at this topic's next scheduled time.");
    await markCompleted(env, query.message.chat.id, query.message.message_id, Number(id), post.url);
    return;
  }

  const topic = await env.DB.prepare("SELECT * FROM topics WHERE slug = ?")
    .bind(post.topic).first<Topic>();
  if (!topic) {
    await answerCallback(env, query.id, "That topic is gone.");
    return;
  }

  const clicked = await env.DB.batch<{ explain_count: number }>([
    env.DB.prepare("INSERT OR IGNORE INTO explanation_clicks (callback_id, post_id, clicked_at) VALUES (?, ?, ?)")
      .bind(query.id, Number(id), now),
    env.DB.prepare(`UPDATE posts SET explain_count = (SELECT COUNT(*) FROM explanation_clicks WHERE post_id = ?),
                   days_without_done = CASE WHEN completed_at IS NULL THEN MAX(days_without_done, ?) ELSE days_without_done END
                   WHERE id = ? RETURNING explain_count`)
      .bind(Number(id), daysWithoutDone, Number(id)),
  ]);
  if (clicked[0].meta.changes === 0) {
    await answerCallback(env, query.id, "This explanation request was already received.");
    return;
  }
  const explainCount = Number(clicked[1].results[0]?.explain_count ?? post.explain_count);
  await answerCallback(env, query.id, "Preparing more source details and examples...");
  const { results: explanations } = await env.DB.prepare(
    `SELECT note FROM explanation_clicks WHERE post_id = ? AND note IS NOT NULL
     ORDER BY clicked_at DESC, callback_id DESC LIMIT 5`,
  ).bind(Number(id)).all<{ note: string }>();
  const chapter = post.chapter_id ? (await chapterProgress(env, post.topic)).find((chapter) => chapter.id === post.chapter_id) : undefined;
  const note = await summarize(env, topic, {
    title: post.title,
    url: post.url,
    textUrl: post.text_url ?? post.url,
    description: post.note ?? post.summary,
    source: post.source,
    format: post.format === "markdown" ? "markdown" : "html",
    published: 0,
    chapterId: post.chapter_id ?? undefined,
    objective: chapter?.objective,
    section: chapter?.section,
  }, {
    mode: "explain",
    previousNote: post.note ?? post.summary,
    daysWithoutDone,
    explainCount,
    previousExplanations: explanations.reverse().map((explanation) => explanation.note),
  });
  if (!note || note.skip) {
    await sendPlain(env, "Could not load the source or expand this lesson right now. Try Explain more again.");
    return;
  }

  const current = await env.DB.prepare("SELECT completed_at FROM posts WHERE id = ?")
    .bind(Number(id)).first<{ completed_at: number | null }>();
  for (const text of renderExplanation(topic, note, post.source, post.url)) {
    const messageId = await sendPost(env, text,
      lessonKeyboard(Number(id), post.url, current?.completed_at != null));
    if (messageId === null) {
      await sendPlain(env, "Could not send the full explanation. Try Explain more again.");
      return;
    }
  }
  await env.DB.prepare("UPDATE explanation_clicks SET note = ? WHERE callback_id = ?")
    .bind(JSON.stringify(note), query.id).run();
}

async function handleChapters(env: Env, slug?: string, pageArgument?: string): Promise<void> {
  if (!slug) {
    const { results } = await env.DB.prepare("SELECT * FROM topics ORDER BY slug").all<Topic>();
    const lines = ["<b>Next chapter by topic</b>"];
    const offset = Number(env.TZ_OFFSET_MINUTES) * 60_000;
    const today = Math.floor((Date.now() + offset) / 86_400_000);
    for (const topic of results) {
      const pending = await env.DB.prepare(
        `SELECT title, sent_at, days_without_done, explain_count FROM posts
         WHERE topic = ? AND completed_at IS NULL AND retired_at IS NULL AND message_id IS NOT NULL
         ORDER BY sent_at ASC LIMIT 1`,
      ).bind(topic.slug).first<{
        title: string; sent_at: number; days_without_done: number; explain_count: number;
      }>();
      if (pending) {
        const days = Math.max(pending.days_without_done, today - Math.floor((pending.sent_at + offset) / 86_400_000));
        lines.push(`<b>${escapeHtml(topic.label)}</b>: ${escapeHtml(pending.title.slice(0, 80))} [Current]`,
          `${days} days without Done · ${pending.explain_count} Explain more clicks`);
        continue;
      }
      if (CURRICULUM_TOPICS.includes(topic.slug)) {
        const chapters = await chapterProgress(env, topic.slug);
        const next = chapters.find((chapter) => !chapter.completed);
        lines.push(`<b>${escapeHtml(topic.label)}</b>: ${next ? escapeHtml(next.title) : "Curriculum completed"}`,
          `/chapters ${topic.slug} [page]`);
        continue;
      }
      const catalogs = (SOURCES[topic.slug as TopicSlug] ?? []).filter((source) => source.kind === "catalog");
      if (catalogs.length === 0) {
        lines.push(`<b>${escapeHtml(topic.label)}</b>: feed lesson chosen at send time; no fixed chapter list yet`);
        continue;
      }
      const candidates = (await Promise.all(catalogs.map((source) => catalogCandidates(env, source)))).flat();
      lines.push(`<b>${escapeHtml(topic.label)}</b>: ${candidates[0]
        ? escapeHtml(candidates[0].title.slice(0, 80))
        : "No upcoming chapter available"}`, `/chapters ${topic.slug} [page]`);
    }
    await sendPlain(env, lines.join("\n"));
    return;
  }

  const topic = await env.DB.prepare("SELECT * FROM topics WHERE slug = ?").bind(slug).first<Topic>();
  if (!topic) {
    await sendPlain(env, "Unknown topic. Use /chapters to see available chapter lists.");
    return;
  }
  const curriculum = CURRICULUM_TOPICS.includes(slug);
  const catalogs = (SOURCES[slug as TopicSlug] ?? []).filter((source) => source.kind === "catalog");
  if (!curriculum && catalogs.length === 0) {
    await sendPlain(env, `${escapeHtml(topic.label)} uses feeds and has no fixed chapter list.`);
    return;
  }
  const page = Number(pageArgument ?? "1");
  if (!Number.isSafeInteger(page) || page < 1) {
    await sendPlain(env, `Use /chapters ${slug} [page], with a positive whole-number page.`);
    return;
  }

  const progress = curriculum ? await chapterProgress(env, slug) : [];
  await Promise.all(catalogs.map((source) => catalogCandidates(env, source)));
  const sources = catalogs.map((source) => source.name);
  const placeholders = sources.map(() => "?").join(",");
  const total = curriculum ? { count: progress.length } : await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM catalog WHERE source IN (${placeholders})`,
  ).bind(...sources).first<{ count: number }>();
  if (!total?.count) {
    await sendPlain(env, "Could not load the chapter list. Try again later.");
    return;
  }
  const perPage = 15;
  const pages = Math.ceil(total.count / perPage);
  if (page > pages) {
    await sendPlain(env, `There are ${pages} pages. Use /chapters ${slug} ${pages} for the last page.`);
    return;
  }

  let results: Array<{
    title: string; completed: number; current: number; seen: number;
    days_without_done: number; explain_count: number;
  }>;
  if (curriculum) {
    results = progress.slice((page - 1) * perPage, page * perPage);
  } else {
    const listed = await env.DB.prepare(
      `SELECT c.title,
              EXISTS(SELECT 1 FROM posts p WHERE p.topic = ? AND p.url = c.url AND p.completed_at IS NOT NULL) AS completed,
              EXISTS(SELECT 1 FROM posts p WHERE p.topic = ? AND p.url = c.url AND p.completed_at IS NULL AND p.message_id IS NOT NULL) AS current,
              EXISTS(SELECT 1 FROM seen s WHERE s.url = c.url) AS seen,
              COALESCE((SELECT MAX(p.days_without_done) FROM posts p WHERE p.topic = ? AND p.url = c.url), 0) AS days_without_done,
              COALESCE((SELECT SUM(p.explain_count) FROM posts p WHERE p.topic = ? AND p.url = c.url), 0) AS explain_count
       FROM catalog c WHERE c.source IN (${placeholders})
       ORDER BY c.source, c.position, c.url LIMIT ? OFFSET ?`,
    ).bind(slug, slug, slug, slug, ...sources, perPage, (page - 1) * perPage)
      .all<{
        title: string; completed: number; current: number; seen: number;
        days_without_done: number; explain_count: number;
      }>();
    results = listed.results;
  }

  let message = `<b>${escapeHtml(topic.label)} chapters</b> · ${page}/${pages} · ${total.count} total`;
  for (const [index, chapter] of results.entries()) {
    const status = chapter.current ? "Current" : chapter.completed ? "Done" : chapter.seen ? "Skipped" : "Upcoming";
    const line = `${(page - 1) * perPage + index + 1}. ${escapeHtml(chapter.title.slice(0, 300))} [${status}] · ${chapter.days_without_done} days without Done · ${chapter.explain_count} explains`;
    if (message.length + line.length + 1 > 3800) {
      await sendPlain(env, message);
      message = "";
    }
    message += `${message ? "\n" : ""}${line}`;
  }
  if (page < pages) message += `\n\nNext page: /chapters ${slug} ${page + 1}`;
  await sendPlain(env, message);
}

async function handleCommand(env: Env, text: string): Promise<void> {
  const [command, argument, page] = text.trim().split(/\s+/);

  if (command === "/start" || command === "/help") {
    await sendPlain(
      env,
      [
        "5 short technical notes a day, around the clock, with the source attached.",
        "",
        "Done completes a lesson. The next scheduled note advances to the next chapter.",
        "Explain more expands the same lesson without completing it.",
        "",
        "<b>/next</b> [javascript|react|backend|systemdesign|ai|systems] - send one now",
        "<b>/chapters</b> [topic] [page] - list chapters and progress",
        "<b>/stats</b> - lessons sent and completed",
      ].join("\n"),
    );
    return;
  }

  if (command === "/next") {
    await sendPlain(env, "Looking...");
    await sendPlain(env, await runOnce(env, argument));
    return;
  }

  if (command === "/chapters") {
    await handleChapters(env, argument, page);
    return;
  }

  if (command === "/stats") {
    const { results } = await env.DB.prepare(
      `SELECT topic,
              COUNT(*) AS sent,
              SUM(completed_at IS NOT NULL) AS completed,
              SUM(explain_count) AS explanations
       FROM posts GROUP BY topic ORDER BY topic`,
    ).all<{ topic: string; sent: number; completed: number; explanations: number }>();
    await sendPlain(
      env,
      results.length === 0
        ? "Nothing sent yet."
        : results
            .map((row) => `<b>${row.topic}</b>: ${row.sent} sent · ${row.completed ?? 0} completed · ${row.explanations ?? 0} Explain more clicks`)
            .join("\n"),
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/webhook") {
      if (request.headers.get("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      const update = (await request.json()) as Update;
      if (update.callback_query) {
        ctx.waitUntil(handleLesson(env, update.callback_query).catch(async (error) => {
          console.error("lesson action failed", String(error));
          await sendPlain(env, "Could not process that lesson action. Try the button again.");
        }));
      } else if (update.message?.text && String(update.message.chat.id) === env.TELEGRAM_CHAT_ID) {
        await handleCommand(env, update.message.text);
      }
      return new Response("ok");
    }

    if (url.pathname.startsWith("/admin/")) {
      if (url.searchParams.get("key") !== env.ADMIN_KEY) return new Response("forbidden", { status: 403 });
      if (url.pathname === "/admin/setup") return new Response(await setWebhook(env, url.origin));
      if (url.pathname === "/admin/run") {
        return new Response(await runOnce(env, url.searchParams.get("topic") ?? undefined));
      }
    }

    return new Response("tech-notes-bot");
  },

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const slot = slotFor(env, new Date(event.scheduledTime));
    if (!slot) return;
    ctx.waitUntil(
      runOnce(env, slot)
        .then((result) => console.log(result))
        .catch((error) => console.error("run failed", slot, String(error))),
    );
  },
};

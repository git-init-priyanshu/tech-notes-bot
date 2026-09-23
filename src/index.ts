import { isRating, nextLevel } from "./difficulty";
import type { Env, Topic } from "./env";
import { runOnce } from "./job";
import { answerCallback, markRated, sendPlain, setWebhook } from "./telegram";

interface Update {
  message?: { chat: { id: number }; text?: string };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
}

function withinActiveHours(env: Env, now: Date): boolean {
  const [from, to] = env.ACTIVE_HOURS.split("-").map(Number);
  const local = new Date(now.getTime() + Number(env.TZ_OFFSET_MINUTES) * 60_000);
  const hour = local.getUTCHours();
  return hour >= from && hour <= to;
}

async function handleRating(env: Env, query: NonNullable<Update["callback_query"]>): Promise<void> {
  const [, rating, id] = (query.data ?? "").split(":");
  if (!isRating(rating)) {
    await answerCallback(env, query.id, "Already rated.");
    return;
  }

  const post = await env.DB.prepare("SELECT topic, url, rating FROM posts WHERE id = ?")
    .bind(Number(id))
    .first<{ topic: string; url: string; rating: string | null }>();
  if (!post) {
    await answerCallback(env, query.id, "That post is gone.");
    return;
  }
  if (post.rating) {
    await answerCallback(env, query.id, `Already rated ${post.rating}.`);
    return;
  }

  const topic = await env.DB.prepare("SELECT * FROM topics WHERE slug = ?")
    .bind(post.topic)
    .first<Topic>();
  if (!topic) return;

  const updated = nextLevel(topic.level, rating);
  await env.DB.batch([
    env.DB.prepare("UPDATE posts SET rating = ?, rated_at = ? WHERE id = ?").bind(rating, Date.now(), Number(id)),
    env.DB.prepare("UPDATE topics SET level = ? WHERE slug = ?").bind(updated, post.topic),
  ]);

  await answerCallback(env, query.id, `${topic.label}: level ${topic.level.toFixed(1)} -> ${updated.toFixed(1)}`);
  if (query.message) {
    await markRated(env, query.message.chat.id, query.message.message_id, post.url, rating);
  }
}

async function handleCommand(env: Env, text: string): Promise<void> {
  const [command, argument] = text.trim().split(/\s+/);

  if (command === "/start" || command === "/help") {
    await sendPlain(
      env,
      [
        "Short technical notes, every couple of hours, with the source attached.",
        "",
        "Rate each one and the next note in that bucket gets harder or easier.",
        "",
        "<b>/next</b> [frontend|backend|ai|systems|systemdesign] - send one now",
        "<b>/level</b> - current difficulty per topic",
        "<b>/stats</b> - what you have been sent and how you rated it",
      ].join("\n"),
    );
    return;
  }

  if (command === "/next") {
    await sendPlain(env, "Looking...");
    await sendPlain(env, await runOnce(env, argument));
    return;
  }

  if (command === "/level") {
    const { results } = await env.DB.prepare("SELECT * FROM topics ORDER BY slug").all<Topic>();
    await sendPlain(
      env,
      results.map((topic) => `${topic.emoji} ${topic.label}: <b>${topic.level.toFixed(1)}</b>`).join("\n"),
    );
    return;
  }

  if (command === "/stats") {
    const { results } = await env.DB.prepare(
      `SELECT topic,
              COUNT(*) AS sent,
              SUM(rating = 'easy') AS easy,
              SUM(rating = 'medium') AS medium,
              SUM(rating = 'hard') AS hard
       FROM posts GROUP BY topic ORDER BY topic`,
    ).all<{ topic: string; sent: number; easy: number; medium: number; hard: number }>();
    await sendPlain(
      env,
      results.length === 0
        ? "Nothing sent yet."
        : results
            .map((row) => `<b>${row.topic}</b>: ${row.sent} sent · ${row.easy ?? 0}E / ${row.medium ?? 0}M / ${row.hard ?? 0}H`)
            .join("\n"),
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/webhook") {
      if (request.headers.get("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      const update = (await request.json()) as Update;
      if (update.callback_query) {
        await handleRating(env, update.callback_query);
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
    if (!withinActiveHours(env, new Date(event.scheduledTime))) return;
    ctx.waitUntil(runOnce(env).then((result) => console.log(result)));
  },
};

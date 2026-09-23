import type { Env, Topic } from "./env";
import type { Note } from "./summarize";

function api(env: Env, method: string, body: unknown): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function ratingKeyboard(postId: number, url: string) {
  return {
    inline_keyboard: [
      [{ text: "📖 Read the source", url }],
      [
        { text: "😌 Easy", callback_data: `r:easy:${postId}` },
        { text: "🙂 Medium", callback_data: `r:medium:${postId}` },
        { text: "🤯 Hard", callback_data: `r:hard:${postId}` },
      ],
    ],
  };
}

export function renderPost(topic: Topic, note: Note, source: string, url: string): string {
  const lines = [
    `${topic.emoji} <b>${escapeHtml(topic.label)}</b> \u00b7 level ${topic.level.toFixed(1)}`,
    "",
    `<b>${escapeHtml(note.headline)}</b>`,
    escapeHtml(note.takeaway),
    "",
    ...note.points.map((point) => `\u2022 ${escapeHtml(point)}`),
  ];
  if (note.deeper) lines.push("", `\ud83d\udd0e ${escapeHtml(note.deeper)}`);
  lines.push("", `<a href="${escapeHtml(url)}">${escapeHtml(source)}</a>`);
  return lines.join("\n");
}

export async function sendPost(env: Env, text: string, keyboard: unknown): Promise<number | null> {
  const response = await api(env, "sendMessage", {
    chat_id: env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: keyboard,
  });
  if (!response.ok) {
    console.error("telegram sendMessage", response.status, await response.text());
    return null;
  }
  const payload = (await response.json()) as { result: { message_id: number } };
  return payload.result.message_id;
}

export async function sendPlain(env: Env, text: string): Promise<void> {
  await api(env, "sendMessage", {
    chat_id: env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

export async function answerCallback(env: Env, callbackId: string, text: string): Promise<void> {
  await api(env, "answerCallbackQuery", { callback_query_id: callbackId, text });
}

export async function markRated(
  env: Env,
  chatId: number,
  messageId: number,
  url: string,
  chosen: string,
): Promise<void> {
  await api(env, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📖 Read the source", url }],
        [{ text: `✅ rated: ${chosen}`, callback_data: "noop" }],
      ],
    },
  });
}

export async function setWebhook(env: Env, workerUrl: string): Promise<string> {
  const response = await api(env, "setWebhook", {
    url: `${workerUrl}/webhook`,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
  });
  return await response.text();
}

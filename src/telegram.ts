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

export function lessonKeyboard(postId: number, url: string, completed = false) {
  return {
    inline_keyboard: [
      [{ text: "📖 Read the source", url }],
      [
        { text: completed ? "✅ Done" : "Done", callback_data: `done:${postId}` },
        { text: "Explain more", callback_data: `explain:${postId}` },
      ],
    ],
  };
}

// Telegram rejects a sendMessage body over 4096 characters, so a long note drops its last
// bullets rather than failing to arrive.
const TELEGRAM_TEXT_LIMIT = 4096;

export function renderPost(topic: Topic, note: Note, source: string, url: string): string {
  const head = [
    `${topic.emoji} <b>${escapeHtml(topic.label)}</b>`,
    "",
    `<b>${escapeHtml(note.headline)}</b>`,
    escapeHtml(note.takeaway),
    "",
  ];
  const tail = note.deeper ? [`\ud83d\udd0e ${escapeHtml(note.deeper)}`, ""] : [];
  tail.push(`<a href="${escapeHtml(url)}">${escapeHtml(source)}</a>`);

  const budget = TELEGRAM_TEXT_LIMIT - [...head, "", ...tail].join("\n").length;
  const points: string[] = [];
  let used = 0;
  for (const point of note.points) {
    const line = `\u2022 ${escapeHtml(point)}`;
    if (used + line.length + 1 > budget) break;
    points.push(line);
    used += line.length + 1;
  }

  return [...head, ...points, "", ...tail].join("\n");
}

export function renderExplanation(topic: Topic, note: Note, source: string, url: string): string[] {
  const heading = `${topic.emoji} <b>${escapeHtml(topic.label)}</b> · <b>${escapeHtml(note.headline)}</b>`;
  const link = `<a href="${escapeHtml(url)}">${escapeHtml(source)}</a>`;
  const fixedLength = heading.length + link.length + 100;
  const chunkLimit = Math.max(1, TELEGRAM_TEXT_LIMIT - fixedLength);
  const paragraphs = [
    note.takeaway,
    ...note.points.map((point) => `• ${point}`),
    ...(note.deeper ? [`🔎 ${note.deeper}`] : []),
  ];
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    let characters: string[] = [];
    let escapedLength = 0;
    for (const character of paragraph) {
      const escaped = escapeHtml(character);
      while (characters.length && escapedLength + escaped.length > chunkLimit) {
        let newline = -1;
        let whitespace = -1;
        for (let index = characters.length - 1; index >= 0; index--) {
          if (newline < 0 && characters[index] === "\n") newline = index;
          if (whitespace < 0 && /\s/.test(characters[index])) whitespace = index;
          if (newline >= 0 && whitespace >= 0) break;
        }
        const boundary = newline >= 0 ? newline + 1 : whitespace + 1;
        if (boundary > 0) {
          chunks.push(characters.slice(0, boundary).join(""));
          characters = characters.slice(boundary);
          escapedLength = characters.reduce((length, value) => length + escapeHtml(value).length, 0);
        } else {
          chunks.push(characters.join(""));
          characters = [];
          escapedLength = 0;
        }
      }
      characters.push(character);
      escapedLength += escaped.length;
    }
    if (characters.length || !paragraph) chunks.push(characters.join(""));
  }

  const parts: string[] = [];
  let body = "";
  for (const chunk of chunks) {
    const escaped = escapeHtml(chunk);
    if (body && body.length + escaped.length + 2 > chunkLimit) {
      parts.push(body);
      body = "";
    }
    body += `${body ? "\n\n" : ""}${escaped}`;
  }
  if (body || !parts.length) parts.push(body);

  return parts.map((part, index) =>
    `${heading}\n\nExplain more · Part ${index + 1}\n\n${part}\n\n${link}`,
  );
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

export async function markCompleted(
  env: Env,
  chatId: number,
  messageId: number,
  postId: number,
  url: string,
): Promise<void> {
  await api(env, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: lessonKeyboard(postId, url, true),
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

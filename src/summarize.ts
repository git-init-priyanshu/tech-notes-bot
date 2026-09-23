import { briefFor } from "./difficulty";
import type { Env, Topic } from "./env";
import type { FeedItem } from "./rss";
import { stripTags } from "./rss";

export interface Note {
  skip: boolean;
  headline: string;
  takeaway: string;
  points: string[];
  deeper: string;
}

const USER_AGENT = "tech-notes-bot/1.0 (+https://github.com/)";

async function articleText(url: string, fallback: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return fallback;
    const body = stripTags(await response.text());
    return body.length > 600 ? body.slice(0, 14_000) : fallback;
  } catch {
    return fallback;
  }
}

function parseJson(raw: string): Note | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<Note>;
    if (parsed.skip) return { skip: true, headline: "", takeaway: "", points: [], deeper: "" };
    if (!parsed.headline || !parsed.takeaway || !Array.isArray(parsed.points)) return null;
    return {
      skip: false,
      headline: parsed.headline,
      takeaway: parsed.takeaway,
      points: parsed.points.slice(0, 4),
      deeper: parsed.deeper ?? "",
    };
  } catch {
    return null;
  }
}

export async function summarize(env: Env, topic: Topic, item: FeedItem, source: string): Promise<Note | null> {
  const text = await articleText(item.link, item.description);
  if (text.length < 300) return null;

  const prompt = `You write a single push notification for one engineer's phone. Topic bucket: ${topic.label}. Their current difficulty level for this bucket is ${topic.level.toFixed(1)} out of 5.

${briefFor(topic.level)}

Source: ${source}
Title: ${item.title}
URL: ${item.link}

Article text:
"""
${text}
"""

Reply with ONLY a JSON object, no prose and no code fence:
{
  "skip": boolean,
  "headline": string,
  "takeaway": string,
  "points": [string, string, string],
  "deeper": string
}

Rules:
- Set "skip": true and leave the other fields empty if the piece is a press release, a job post, a changelog with no idea in it, a paywalled stub, or has no technical substance worth two minutes.
- "headline": under 60 characters, states the idea, not the event.
- "takeaway": one sentence, under 25 words, the thing worth remembering.
- "points": exactly 3 bullets, each under 20 words, concrete mechanism or trade-off. No filler, no "learn more".
- "deeper": one short sentence naming the specific question to chase next. Empty string if there is none.
- Plain text only. No markdown, no emoji, no HTML.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error("anthropic", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as { content: Array<{ type: string; text?: string }> };
  const raw = payload.content.find((block) => block.type === "text")?.text ?? "";
  return parseJson(raw);
}

import { briefFor } from "./difficulty";
import type { Env, Topic } from "./env";
import type { Candidate } from "./job";
import { stripTags } from "./rss";

export interface Note {
  skip: boolean;
  headline: string;
  takeaway: string;
  points: string[];
  deeper: string;
}

const USER_AGENT = "tech-notes-bot/1.0";

async function articleText(candidate: Candidate): Promise<string> {
  try {
    const response = await fetch(candidate.textUrl, {
      headers: { "user-agent": USER_AGENT, accept: "text/html, text/plain, */*" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return candidate.description;
    const raw = await response.text();
    const body = candidate.format === "markdown" ? raw.replace(/\s+/g, " ").trim() : stripTags(raw);
    return body.length > 600 ? body.slice(0, 14_000) : candidate.description;
  } catch {
    return candidate.description;
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

export async function summarize(env: Env, topic: Topic, candidate: Candidate): Promise<Note | null> {
  const text = await articleText(candidate);
  if (text.length < 300) return null;

  const prompt = `You write a single push notification for one engineer's phone. Topic bucket: ${topic.label}. Their current difficulty level for this bucket is ${topic.level.toFixed(1)} out of 5.

${briefFor(topic.level)}

Source: ${candidate.source}
Title: ${candidate.title}
URL: ${candidate.url}

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

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "x-title": "tech-notes-bot",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || "google/gemini-2.5-flash-lite",
      max_tokens: 700,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error("openrouter", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as {
    error?: { message: string };
    choices?: Array<{ message: { content: string | null } }>;
  };
  if (payload.error) {
    console.error("openrouter", payload.error.message);
    return null;
  }
  return parseJson(payload.choices?.[0]?.message?.content ?? "");
}

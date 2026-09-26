import { briefFor } from "./difficulty";
import type { Env, Topic } from "./env";
import type { Candidate } from "./job";
import { stripTags } from "./rss";
import type { TopicSlug } from "./sources";

export interface Note {
  skip: boolean;
  headline: string;
  takeaway: string;
  points: string[];
  deeper: string;
}

const USER_AGENT = "tech-notes-bot/1.0";

const ANGLE: Record<TopicSlug, string> = {
  javascript:
    "Teach the language mechanic itself: how the engine behaves, the exact semantics, and the trap a working developer hits when they assume otherwise.",
  react:
    "Teach the React model behind the API: when it runs, what it re-renders, what it guarantees, and the mistake the docs are written to prevent.",
  backend:
    "Focus on API and backend design judgement: resource modelling, versioning, pagination, idempotency, error contracts, auth, data modelling, caching, queues, and the failure the design choice is buying protection from.",
  systemdesign:
    "Focus on the architecture trade-off: what breaks at scale, which constraint forces the design, and what the alternative would have cost.",
  ai:
    "Frame it as what a company hiring an AI engineer today expects them to do: retrieval and RAG quality, evaluation harnesses and error analysis, agent orchestration and tool use, context and prompt engineering, guardrails, cost and latency control, observability, and the data work underneath. Skip capability hype and model leaderboards.",
  systems:
    "Focus on what the machine actually does underneath and how to observe it.",
};

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
      points: parsed.points.filter((point): point is string => typeof point === "string" && point.trim().length > 0),
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

${ANGLE[topic.slug as TopicSlug] ?? ""}

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
  "points": [string, ...],
  "deeper": string
}

This reader wants to learn something durable. They do not want news.
- Set "skip": true and leave the other fields empty if the piece is news rather than teaching: a funding round, an acquisition, a hiring or job post, a product launch or availability announcement, a model or version release, a changelog or release notes, a roadmap, a conference or event recap, an interview, a press release, a benchmark or leaderboard result, a paywalled stub, or vendor marketing.
- Also skip a table of contents or index page, a deprecated legacy API, and anything with no technical idea worth two minutes.
- If the piece reports an event but explains a durable technique underneath it, do not skip; write about the technique and ignore the event.
- "headline": under 60 characters, states the idea, not the event.
- "takeaway": one sentence, under 25 words, the thing worth remembering.
- "points": the body of the note, and the reason it exists. Write as many bullets as this
  particular piece actually needs, and no more: a simple idea may take 4, a dense one 15. Do not
  pad to a number and do not stop early while a load-bearing part is still unexplained.
  Together they must teach the thing well enough that the reader never has to open the source.
- Every bullet carries one idea and a concrete detail: the real API or option name, the number,
  the default, the order things run in, the exact error, the specific case that breaks. A bullet
  that could be guessed from the headline is worth nothing, so cut it.
- Write the bullets in simple English. Short common words, active voice, one clause where one
  clause will do, under 25 words each. Gloss a term the moment you use it. Plain does not mean
  vague: keep the precise technical noun and explain it, never swap it for something fuzzier.
- Order the bullets so they build: what it is, how it works, then where it bites.
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
      max_tokens: 1600,
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

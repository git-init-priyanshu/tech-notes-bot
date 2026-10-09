import type { Env, Topic } from "./env";
import type { Candidate } from "./job";
import { decodeEntities, stripTags } from "./rss";
import type { TopicSlug } from "./sources";

export interface Note {
  skip: boolean;
  headline: string;
  takeaway: string;
  points: string[];
  deeper: string;
}

export interface LessonFeedback {
  mode: "explain" | "repeat";
  previousNote: string;
  daysWithoutDone: number;
  explainCount: number;
  previousExplanations?: string[];
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

async function articleText(candidate: Candidate, expanded: boolean): Promise<string> {
  try {
    const response = await fetch(candidate.textUrl, {
      headers: { "user-agent": USER_AGENT, accept: "text/html, text/plain, */*" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return expanded || candidate.chapterId ? "" : candidate.description;
    let raw = await response.text();
    if (candidate.format === "html") {
      raw = raw.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? raw;
    }
    if (candidate.section) {
      const headings = [...raw.matchAll(candidate.format === "markdown"
        ? /^(#{1,6})[ \t]+(.+)$/gm
        : /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
      const sections = Array.isArray(candidate.section) ? candidate.section : [candidate.section];
      const selectedText: string[] = [];
      for (const section of sections) {
        const index = headings.findIndex((heading) => stripTags(heading[2]).trim().toLowerCase() === section.toLowerCase());
        if (index < 0) {
          console.error("chapter source section missing", candidate.chapterId, section);
          return "";
        }
        const selected = headings[index];
        const level = candidate.format === "markdown" ? selected[1].length : Number(selected[1]);
        const next = headings.slice(index + 1).find((heading) =>
          (candidate.format === "markdown" ? heading[1].length : Number(heading[1])) <= level);
        selectedText.push(raw.slice(selected.index, next?.index ?? raw.length));
      }
      raw = selectedText.join("\n\n");
    }
    if (expanded) {
      const body = candidate.format === "markdown" ? raw.trim() : decodeEntities(raw
        .replace(/<(script|style|nav|footer|header|aside|form|svg)\b[\s\S]*?<\/\1>/gi, " ")
        .replace(/<br\b[^>]*>/gi, "\n")
        .replace(/<\/(p|li|h[1-6]|pre|div|section|tr)>/gi, "\n")
        .replace(/<[^>]+>/g, " "));
      return body.length >= 80 ? body.slice(0, 48_000) : "";
    }
    const body = candidate.format === "markdown" ? raw.replace(/\s+/g, " ").trim() : stripTags(raw);
    if (candidate.chapterId) return body.length >= 80 ? body.slice(0, 14_000) : "";
    return body.length > 600 ? body.slice(0, 14_000) : candidate.description;
  } catch {
    return expanded || candidate.chapterId ? "" : candidate.description;
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

export async function summarize(
  env: Env,
  topic: Topic,
  candidate: Candidate,
  feedback?: LessonFeedback,
): Promise<Note | null> {
  const expanded = feedback?.mode === "explain";
  const text = await articleText(candidate, expanded);
  if (expanded && text.length < 80) return null;
  if (candidate.chapterId && text.length < 80 && !feedback) return null;
  if (!candidate.chapterId && text.length < 300 && !feedback) return { skip: true, headline: "", takeaway: "", points: [], deeper: "" };

  const prompt = `${expanded ? "You write an expanded lesson that can span several Telegram messages." : "You write a single push notification for one engineer's phone."} Topic bucket: ${topic.label}.

Teach a working developer in plain English. Define unfamiliar terms, explain the mechanism, and give concrete examples and trade-offs.
${candidate.chapterId ? `Assigned curriculum chapter: ${candidate.title}
Learning objective: ${candidate.objective}
Teach only this objective from the supplied source. Ignore news and other sections. Keep the assigned chapter title. This is an ordered lesson, so do not skip it or introduce the next chapter.` : ""}
${expanded ? `The reader asked for MORE INFORMATION on this chapter. Expand it with source details that the lesson and earlier explanations have not covered. A paraphrase of the previous note does not answer the request.
Keep the topic and learning objective fixed. Explain the source's mechanisms, exact API names, conditions, limitations, and practical implications. Refer to relevant section names when useful. Use the supplied source as the factual authority; do not fill gaps with unrelated advice.
Include two worked examples when the source supports them. Prefer the source's examples, preserving inputs, steps, and results. Label an example you construct as an adapted example. Explain why each result occurs. Preserve code line breaks and indentation when code helps.
More clicks ask for additional relevant detail, not fewer ideas. Keep each step easy to digest. If the supplied source has no further relevant detail, say so instead of inventing facts or repeating the previous explanation.

Lesson already sent:
${feedback.previousNote}

Earlier explanations already sent:
${feedback.previousExplanations?.join("\n\n") || "None."}` : feedback ? `This is the same chapter, not a new lesson. This chapter has ${feedback.daysWithoutDone} recorded local calendar days without Done and ${feedback.explainCount} Explain more clicks.
Rewrite the lesson so it is much easier to digest than the previous note.
Treat these counts as signals that the presentation may be too difficult, not as proof of the reader's ability. As the counts grow, introduce fewer ideas at once, define prerequisites, and use shorter sentences. Start with the basic idea, show one small concrete example, then explain why it works. Keep the facts accurate and stay on this chapter. Do not add advanced tangents. Do not skip this lesson.

Previous note:
${feedback.previousNote}` : ""}

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
${expanded
  ? '- "points": add substantive source details, usually 8-14 concise pointers when the source supports them. Then add worked examples as separate items with short numbered steps and expected results. Cover how and why, important conditions, and mistakes to avoid. Do not pad, restate the lesson, or repeat earlier explanations.'
  : feedback
  ? '- "points": use 3-6 short bullets that explain the basic idea and walk through one small example. Each bullet should be easy to understand on its own. Prefer clarity over covering every advanced detail.'
  : `- "points": the body of the note, and the reason it exists. Write as many bullets as this
  particular piece actually needs, and no more: a simple idea may take 4, a dense one 15. Do not
  pad to a number and do not stop early while a load-bearing part is still unexplained.
  Together they must teach the thing well enough that the reader never has to open the source.`}
- Every bullet carries one idea and a concrete detail: the real API or option name, the number,
  the default, the order things run in, the exact error, the specific case that breaks. A bullet
  that could be guessed from the headline is worth nothing, so cut it.
- Write the bullets in simple English. Short common words, active voice, one clause where one
  clause will do. ${expanded ? "Keep ordinary pointers under 50 words. Worked examples can take 60-100 words split into short steps." : "Keep each bullet under 25 words."} Gloss a term the moment you use it. Plain does not mean
  vague: keep the precise technical noun and explain it, never swap it for something fuzzier.
- Order the bullets so they build: what it is, how it works, then where it bites.
- "deeper": one short sentence naming the specific question to chase next. Empty string if there is none.
${feedback ? '- Leave "deeper" empty. Keep attention on understanding the current chapter.' : ""}
- Plain text only. No markdown, no emoji, no HTML. ${expanded ? "Code and numbered steps within a point may use line breaks." : ""}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "x-title": "tech-notes-bot",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || "openai/gpt-6-luna",
      // Reasoning tokens spend the output budget before lesson text does.
      max_tokens: expanded ? 6000 : 4000,
      reasoning: { effort: "low" },
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "note",
          strict: true,
          schema: {
            type: "object",
            properties: {
              skip: { type: "boolean" },
              headline: { type: "string" },
              takeaway: { type: "string" },
              points: { type: "array", items: { type: "string" } },
              deeper: { type: "string" },
            },
            required: ["skip", "headline", "takeaway", "points", "deeper"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: prompt }],
    }),
  }).catch((error) => {
    console.error("openrouter", String(error));
    return null;
  });
  if (!response) return null;

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
  const note = parseJson(payload.choices?.[0]?.message?.content ?? "");
  if (note && candidate.chapterId && !note.skip) note.headline = candidate.title;
  return note;
}

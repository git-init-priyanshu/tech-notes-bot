# tech-notes-bot

A Telegram bot that pushes 5 short technical notes a day, each with a link back to the source
it came from. Press Done to complete a lesson, or Explain more for a fuller explanation of
the same chapter.

Runs entirely on Cloudflare Workers and D1: an hourly Cron Trigger looks up which topic that
hour is for, picks the next lesson, summarises it through OpenRouter, and sends it to Telegram.
A topic repeats its unfinished lesson each day until Done is clicked, then sends its next
lesson at the next scheduled time.
Explain more leaves progress unchanged.

It teaches; it does not report. The model is told to skip launches, releases, funding, hiring
posts, changelogs, benchmarks and conference recaps outright.

## The day

One note per topic per day, spaced about five hours apart around the clock:

| Local hour | 0 | 5 | 10 | 15 | 20 |
|---|---|---|---|---|---|
| Topic | AI | JS | React | Backend | Sys design |

That is one each of JavaScript, React, AI, backend and system design. The table lives in
`src/schedule.ts`; edit it and the daily mix changes with it. The cron stays hourly either way,
and an hour with no entry just returns early.

Topics: `javascript`, `react`, `backend`, `systemdesign`, `ai`, and `systems`.
`systems` has no scheduled slot and is only reachable through
`/next systems`.

## Where the notes come from

Two kinds of source:

- **Catalogs** walk a documentation site in curriculum order, oldest lesson first.
  `javascript` reads the 175 lessons of [javascript.info](https://javascript.info); `react`
  reads the 179 pages of [react.dev](https://react.dev) via its `llms.txt` index, pulling the
  raw `.md` behind each page. The list is cached in D1 and refreshed monthly. Once a site has
  been completed end to end, no further lessons are sent.
- **Feeds** are RSS, used for `backend`, `systemdesign`, `ai` and `systems`. These still select
  the newest unread articles; ordered curricula for these topics are a proposed next change.

Each topic also carries an angle that steers the summary. `ai` is pointed at what companies
hiring AI engineers actually expect: retrieval and RAG quality, evaluation harnesses and error
analysis, agent orchestration and tool use, context engineering, guardrails, cost and latency,
observability. `backend` is pointed at API design judgement. Both live in `src/summarize.ts`.

## Each run

1. Cron fires hourly. If the local hour has no slot, it returns without sending.
2. If the topic has an unfinished lesson, it rewrites that chapter more simply on the next
   local day. More days without Done and more Explain more clicks ask for fewer ideas, shorter
   sentences, defined prerequisites, and one small worked example. If rewriting fails, the
   saved note is resent instead.
   Repeats share the same completion state and do not count as new lessons in stats.
   Further runs that day wait for Done without sending another copy.
3. Picks the next unfinished catalog chapter, or the newest unread feed article.
4. Sends the source text to the model. News, index pages, and unsuitable material can be skipped.
   A failed catalog summary leaves that chapter in place for the next attempt.
5. Sends the note with Read the source, Done, and Explain more buttons.
6. Done records completion. The next scheduled run sends the next lesson. Repeated clicks do
   not advance extra chapters. Explain more sends a worked explanation of the same source.

Commands: `/next [topic]`, `/chapters [topic] [page]`, `/stats`, `/help`. `/next` sends a lesson
immediately when the topic has no unfinished lesson, or repeats its unfinished lesson if it
has not been sent that local day. It does not bypass Done.

`/chapters` shows the current or next chapter against each topic. `/chapters javascript` or `/chapters react`
shows 15 chapters at a time in curriculum order, marked Done, Current, Skipped, or Upcoming.
Use `/chapters javascript 2` for the next page. Feed topics report that their chapter lists
are not enabled yet. Chapter lists show days without Done and Explain more counts.
Listing chapters does not change progress.

`posts.days_without_done` starts at zero and records elapsed local calendar days since the
lesson was first sent. Repeats keep that original date; completion freezes the count.
`posts.explain_count` counts button presses even when generating an explanation fails.
`explanation_clicks` records Telegram callback IDs so webhook retries do not double-count a
click. New lessons start both counters at zero. `/stats` includes total explanation clicks.

The topic chapter outlines are in [docs/topic-chapters.md](docs/topic-chapters.md).

## Deploy

### 1. Create the bot

Message [@BotFather](https://t.me/BotFather) on Telegram, send `/newbot`, follow the prompts.
Keep the token it gives you.

### 2. Find your chat id

Send any message to your new bot, then:

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | rg -o '"chat":\{"id":-?[0-9]+'
```

### 3. Install and log in

```bash
npm install
node_modules/.bin/wrangler login
```

### 4. Create the database

```bash
node_modules/.bin/wrangler d1 create tech-notes
```

Paste the printed `database_id` into `wrangler.toml`, then create the tables:

```bash
npm run db:init
```

Upgrading an existing install instead? Run `npm run db:migrate` before deploying this version.
It applies the catalog, lesson completion, and learning feedback migrations. Existing sent lessons
count as completed, preserving the current chapter position. The new buttons appear on newly
sent lessons; old rating buttons direct you to `/next`. For local upgrades, use
`npm run db:migrate:local`. Fresh databases created from `schema.sql` already have the new
columns and do not need these historical migrations.

### 5. Set the secrets

```bash
node_modules/.bin/wrangler secret put TELEGRAM_BOT_TOKEN
node_modules/.bin/wrangler secret put TELEGRAM_CHAT_ID
node_modules/.bin/wrangler secret put TELEGRAM_WEBHOOK_SECRET   # any random string you invent
node_modules/.bin/wrangler secret put OPENROUTER_API_KEY        # openrouter.ai/keys
node_modules/.bin/wrangler secret put ADMIN_KEY                 # any random string you invent
```

Generate the two random ones with `openssl rand -hex 24`.

### 6. Deploy and register the webhook

```bash
npm run deploy
curl -X POST "https://tech-notes-bot.<your-subdomain>.workers.dev/admin/setup?key=<ADMIN_KEY>"
```

### 7. Send one now to check it

```bash
curl -X POST "https://tech-notes-bot.<your-subdomain>.workers.dev/admin/run?key=<ADMIN_KEY>"
```

Or send `/next` to the bot. Watch logs with `npm run tail`.

## Tuning

`wrangler.toml` `[vars]`:

- `TZ_OFFSET_MINUTES` - minutes ahead of UTC. `330` is IST.
- `OPENROUTER_MODEL` - `openai/gpt-6-luna` by default. Any model you put here has to support
  `response_format: json_schema`, because the note is requested as a strict schema rather than
  scraped out of prose. Note that `gpt-6-luna` ignores `temperature`, so the call does not send
  one; a model swap that wants sampling control has to add it back.

The cron in `[triggers]` is `"30 * * * *"`, chosen so that UTC `:30` lands on the hour in IST.
If you change `TZ_OFFSET_MINUTES`, move the cron minute to match, or the hours in
`src/schedule.ts` will drift off the hour.

Which topic each hour gets is `SCHEDULE` in `src/schedule.ts`. Sources are `src/sources.ts`.
All configured feeds are eligible; there are no difficulty levels or feed gates.

## Cost

Cloudflare Workers, Cron Triggers, and D1 all sit inside the free tier at this volume. D1's free
plan allows 5 million rows read and 100,000 rows written per day against 5 GB of storage; this
bot uses a few thousand reads and around 60 writes a day.

OpenRouter is the only real cost. An article is capped at 14,000 characters, so a call runs
roughly 4k input tokens, and about 9 calls a day once skipped candidates are counted. Output is
larger than it looks: `reasoning: { effort: "low" }` tokens bill at the output rate on top of the
note itself.

| Model | in $/M | out $/M | ~$/month |
|---|---|---|---|
| `openai/gpt-6-luna` (default) | 0.10 | 0.50 | ~0.22 |
| `google/gemini-2.5-flash-lite` | 0.10 | 0.40 | ~0.20 |
| `google/gemini-2.5-flash` | 0.30 | 2.50 | ~0.88 |
| `anthropic/claude-haiku-4.5` | 1.00 | 5.00 | ~2.21 |

`openai/gpt-6-luna-pro` costs the same per token as `gpt-6-luna` and is the same weights served
with `reasoning.mode: pro`. It is not the default: turning an article into five fields is not a
reasoning-heavy task, so the extra reasoning tokens are paid for and thrown away.

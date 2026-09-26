# tech-notes-bot

A Telegram bot that pushes 14 short technical notes a day, each with a link back to the source
it came from. You rate a note Easy / Medium / Hard and the next note in that topic gets harder
or easier.

Runs entirely on Cloudflare Workers and D1: an hourly Cron Trigger looks up which topic that
hour is for, picks an unread article, summarises it through OpenRouter, and sends it to
Telegram. Button presses come back through a webhook and move that topic's difficulty level.

It teaches; it does not report. The model is told to skip launches, releases, funding, hiring
posts, changelogs, benchmarks and conference recaps outright.

## The day

One note per hour from 07:00 to 22:00 local, with 12:00 and 18:00 left quiet:

| Local hour | 7 | 8 | 9 | 10 | 11 | 13 | 14 | 15 | 16 | 17 | 19 | 20 | 21 | 22 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Topic | JS | AI | React | Backend | AI | JS | Sys design | AI | React | Backend | JS | AI | Sys design | React |

That is 6 frontend (3 JavaScript + 3 React), 4 AI, 2 backend, 2 system design. The table lives
in `src/schedule.ts`; edit it and the daily mix changes with it.

Topics: `javascript`, `react`, `backend`, `systemdesign`, `ai`, and `systems`. Each carries a
level from 1 to 5 (starts at 2.5). `systems` has no scheduled slot and is only reachable through
`/next systems`.

## Where the notes come from

Two kinds of source:

- **Catalogs** walk a documentation site in curriculum order, oldest lesson first.
  `javascript` reads the 175 lessons of [javascript.info](https://javascript.info); `react`
  reads the 179 pages of [react.dev](https://react.dev) via its `llms.txt` index, pulling the
  raw `.md` behind each page. The list is cached in D1 and refreshed monthly. Once a site has
  been read end to end the pass starts over.
- **Feeds** are RSS, used for `backend`, `systemdesign`, `ai` and `systems`. A feed with a
  `minLevel` stays hidden until your level for that topic reaches it.

Each topic also carries an angle that steers the summary. `ai` is pointed at what companies
hiring AI engineers actually expect: retrieval and RAG quality, evaluation harnesses and error
analysis, agent orchestration and tool use, context engineering, guardrails, cost and latency,
observability. `backend` is pointed at API design judgement. Both live in `src/summarize.ts`.

## Each run

1. Cron fires hourly. If the local hour has no slot, it returns without sending.
2. Looks up that hour's topic and gathers candidates it has not already sent.
3. Sends the first candidate's full text to the model with a brief written for your current
   level. The model can answer `skip: true`, in which case the next candidate is tried (up to 6
   per run).
4. Sends the note with a source button and three rating buttons.
5. A rating updates the level: Easy `+0.6`, Medium `+0.05`, Hard `-0.5`, clamped to 1-5.
   The level changes both the writing brief and which feeds are eligible.

Commands: `/next [topic]`, `/level`, `/stats`, `/help`.

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

Upgrading an existing install instead? Run `npm run db:migrate`. It adds the catalog table and
splits the old `frontend` topic into `javascript` and `react`, carrying the level it had learned
across to both.

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

Which topic each hour gets is `SCHEDULE` in `src/schedule.ts`. Sources are `src/sources.ts`;
`minLevel` gates a feed until your level reaches it, which is how Marc Brooker and Brendan Gregg
stay out of the way until you have asked for harder material.

## Cost

Cloudflare Workers, Cron Triggers, and D1 all sit inside the free tier at this volume. D1's free
plan allows 5 million rows read and 100,000 rows written per day against 5 GB of storage; this
bot uses a few thousand reads and around 300 writes a day.

OpenRouter is the only real cost. An article is capped at 14,000 characters, so a call runs
roughly 4k input tokens, and about 25 calls a day once skipped candidates are counted. Output is
larger than it looks: `reasoning: { effort: "low" }` tokens bill at the output rate on top of the
note itself.

| Model | in $/M | out $/M | ~$/month |
|---|---|---|---|
| `openai/gpt-6-luna` (default) | 0.10 | 0.50 | ~0.75 |
| `google/gemini-2.5-flash-lite` | 0.10 | 0.40 | ~0.55 |
| `google/gemini-2.5-flash` | 0.30 | 2.50 | ~2.45 |
| `anthropic/claude-haiku-4.5` | 1.00 | 5.00 | ~6.15 |

`openai/gpt-6-luna-pro` costs the same per token as `gpt-6-luna` and is the same weights served
with `reasoning.mode: pro`. It is not the default: turning an article into five fields is not a
reasoning-heavy task, so the extra reasoning tokens are paid for and thrown away.

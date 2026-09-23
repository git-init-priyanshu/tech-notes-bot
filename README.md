# tech-notes-bot

A Telegram bot that pushes one short technical note every couple of hours, each with a link
back to the source it came from. You rate the note Easy / Medium / Hard and the next note in
that topic gets harder or easier.

Runs entirely on Cloudflare Workers: a Cron Trigger picks the topic, pulls RSS feeds,
summarises one article with the Claude API, and sends it to Telegram. Button presses come back
through a webhook and move that topic's difficulty level.

## How it works

Topics: `frontend`, `backend`, `ai`, `systems`, `systemdesign`. Each carries a level from 1 to 5
(starts at 2.5).

1. Cron fires every 2 hours. Outside `ACTIVE_HOURS` in your timezone, it returns without sending.
2. Picks the topic that has gone longest without a post.
3. Fetches that topic's feeds in parallel, drops anything older than 30 days or already seen,
   and drops feeds whose `minLevel` is above your current level for the topic.
4. Sends the newest candidate's full text to Claude with a brief written for your current level.
   Claude can answer `skip: true` for press releases and changelogs with no idea in them, in
   which case the next candidate is tried (up to 6 per run).
5. Sends the note with a source button and three rating buttons.
6. A rating updates the level: Easy `+0.6`, Medium `+0.05`, Hard `-0.5`, clamped to 1-5.
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

### 5. Set the secrets

```bash
node_modules/.bin/wrangler secret put TELEGRAM_BOT_TOKEN
node_modules/.bin/wrangler secret put TELEGRAM_CHAT_ID
node_modules/.bin/wrangler secret put TELEGRAM_WEBHOOK_SECRET   # any random string you invent
node_modules/.bin/wrangler secret put ANTHROPIC_API_KEY         # console.anthropic.com
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
- `ACTIVE_HOURS` - `"8-23"` means nothing is sent before 8am or after 11pm local.
- `ANTHROPIC_MODEL` - `claude-sonnet-5` by default. `claude-haiku-4-5-20251001` is roughly
  10x cheaper and noticeably blunter.

Cron cadence lives in `[triggers]`. `"0 */2 * * *"` is every 2 hours UTC; with the default
active window that lands around 8 notes a day.

Feeds live in `src/feeds.ts`. `minLevel` gates a feed until your level reaches it, which is how
Brendan Gregg and Marc Brooker stay out of the way until you have asked for harder material.

## Cost

Cloudflare Workers, Cron Triggers, and D1 all sit inside the free tier at this volume.

Claude is the only real cost: roughly 15k input tokens per article. At 8 notes a day with
`claude-sonnet-5` that is around $10-15/month, and skipped candidates count too. Switch to
Haiku to cut it to about $1/month.
# tech-notes-bot

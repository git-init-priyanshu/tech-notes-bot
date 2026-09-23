export interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  OPENROUTER_API_KEY: string;
  ADMIN_KEY: string;
  OPENROUTER_MODEL: string;
  TZ_OFFSET_MINUTES: string;
  ACTIVE_HOURS: string;
}

export interface Topic {
  slug: string;
  label: string;
  emoji: string;
  level: number;
  last_sent_at: number | null;
}

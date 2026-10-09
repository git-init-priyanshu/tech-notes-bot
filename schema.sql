CREATE TABLE IF NOT EXISTS topics (
  slug         TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  emoji        TEXT NOT NULL,
  last_sent_at INTEGER
);

CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  topic        TEXT NOT NULL,
  url          TEXT NOT NULL,
  title        TEXT NOT NULL,
  source       TEXT NOT NULL,
  summary      TEXT NOT NULL,
  text_url     TEXT,
  format       TEXT,
  note         TEXT,
  message_id   INTEGER,
  sent_at      INTEGER NOT NULL,
  completed_at INTEGER,
  days_without_done INTEGER NOT NULL DEFAULT 0,
  explain_count INTEGER NOT NULL DEFAULT 0,
  chapter_id TEXT,
  retired_at INTEGER
);

CREATE INDEX IF NOT EXISTS posts_topic_sent ON posts (topic, sent_at DESC);
CREATE INDEX IF NOT EXISTS posts_topic_chapter ON posts (topic, chapter_id);

CREATE TABLE IF NOT EXISTS explanation_clicks (
  callback_id TEXT PRIMARY KEY,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  clicked_at  INTEGER NOT NULL,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS explanation_clicks_post ON explanation_clicks (post_id);

CREATE TABLE IF NOT EXISTS seen (
  url     TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog (
  url      TEXT PRIMARY KEY,
  text_url TEXT NOT NULL,
  title    TEXT NOT NULL,
  source   TEXT NOT NULL,
  format   TEXT NOT NULL,
  position INTEGER NOT NULL,
  added_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS catalog_pick ON catalog (source, position);

INSERT OR IGNORE INTO topics (slug, label, emoji) VALUES
  ('javascript',   'JavaScript',    '🟨'),
  ('react',        'React',         '⚛️'),
  ('backend',      'Backend',       '⚙️'),
  ('systemdesign', 'System Design', '🏗️'),
  ('ai',           'AI',            '🧠'),
  ('systems',      'Systems',       '🔩');

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL REFERENCES topics(slug),
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  text_url TEXT NOT NULL,
  source TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('html', 'markdown')),
  objective TEXT NOT NULL,
  sections TEXT,
  read_at INTEGER,
  UNIQUE (topic, position)
);

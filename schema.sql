CREATE TABLE IF NOT EXISTS topics (
  slug         TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  emoji        TEXT NOT NULL,
  level        REAL NOT NULL DEFAULT 2.5,
  last_sent_at INTEGER
);

CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  topic      TEXT NOT NULL,
  url        TEXT NOT NULL,
  title      TEXT NOT NULL,
  source     TEXT NOT NULL,
  summary    TEXT NOT NULL,
  level      REAL NOT NULL,
  message_id INTEGER,
  sent_at    INTEGER NOT NULL,
  rating     TEXT,
  rated_at   INTEGER
);

CREATE INDEX IF NOT EXISTS posts_topic_sent ON posts (topic, sent_at DESC);

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

ALTER TABLE posts ADD COLUMN chapter_id TEXT;
ALTER TABLE posts ADD COLUMN retired_at INTEGER;
CREATE INDEX IF NOT EXISTS posts_topic_chapter ON posts (topic, chapter_id);

-- Feed lessons remain in history but no longer block the ordered curriculum.
UPDATE posts SET retired_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE topic IN ('ai', 'backend', 'systemdesign') AND completed_at IS NULL AND chapter_id IS NULL;

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

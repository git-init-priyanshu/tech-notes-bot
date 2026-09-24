-- Splits the old frontend bucket into javascript and react, carrying over the learned level,
-- and adds the catalog table that backs javascript.info and react.dev.

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

INSERT OR IGNORE INTO topics (slug, label, emoji, level)
  SELECT 'javascript', 'JavaScript', '🟨', level FROM topics WHERE slug = 'frontend';
INSERT OR IGNORE INTO topics (slug, label, emoji, level)
  SELECT 'react', 'React', '⚛️', level FROM topics WHERE slug = 'frontend';

INSERT OR IGNORE INTO topics (slug, label, emoji) VALUES
  ('javascript',   'JavaScript',    '🟨'),
  ('react',        'React',         '⚛️'),
  ('backend',      'Backend',       '⚙️'),
  ('systemdesign', 'System Design', '🏗️'),
  ('ai',           'AI',            '🧠'),
  ('systems',      'Systems',       '🔩');

UPDATE posts SET topic = 'javascript' WHERE topic = 'frontend';
DELETE FROM topics WHERE slug = 'frontend';

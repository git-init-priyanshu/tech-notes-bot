ALTER TABLE posts ADD COLUMN days_without_done INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN explain_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS explanation_clicks (
  callback_id TEXT PRIMARY KEY,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  clicked_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS explanation_clicks_post ON explanation_clicks (post_id);

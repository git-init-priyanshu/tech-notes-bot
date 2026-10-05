ALTER TABLE topics DROP COLUMN level;
ALTER TABLE posts DROP COLUMN level;
ALTER TABLE posts DROP COLUMN rating;
ALTER TABLE posts DROP COLUMN rated_at;
ALTER TABLE posts ADD COLUMN text_url TEXT;
ALTER TABLE posts ADD COLUMN format TEXT;
ALTER TABLE posts ADD COLUMN note TEXT;
ALTER TABLE posts ADD COLUMN completed_at INTEGER;

-- Historical lessons keep their existing place in the curriculum.
UPDATE posts SET completed_at = sent_at;

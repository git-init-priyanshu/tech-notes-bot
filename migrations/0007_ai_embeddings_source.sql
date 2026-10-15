UPDATE chapters
SET url = 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2#usage-sentence-transformers',
    text_url = 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/raw/main/README.md',
    source = 'Sentence Transformers',
    format = 'markdown',
    sections = '["Usage (Sentence-Transformers)", "Usage (HuggingFace Transformers)", "Intended uses"]'
WHERE id = 'ai:embeddings'
  AND text_url = 'https://huggingface.co/learn/llm-course/chapter2/4';

UPDATE posts
SET url = (SELECT url FROM chapters WHERE id = posts.chapter_id),
    text_url = (SELECT text_url FROM chapters WHERE id = posts.chapter_id),
    source = (SELECT source FROM chapters WHERE id = posts.chapter_id),
    format = (SELECT format FROM chapters WHERE id = posts.chapter_id)
WHERE chapter_id = 'ai:embeddings'
  AND completed_at IS NULL
  AND text_url = 'https://huggingface.co/learn/llm-course/chapter2/4'
  AND EXISTS (SELECT 1 FROM chapters WHERE id = posts.chapter_id
              AND text_url = 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/raw/main/README.md');

CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ebook_id UUID REFERENCES ebooks(id) ON DELETE CASCADE,
    chapter_number INT,
    title TEXT, -- Optional, extracted from EPUB or generated
    text_content TEXT,
    audio_url TEXT, -- URL to the generated MP3 in Supabase Storage
    audio_duration_seconds INT, -- Optional
    status TEXT, -- e.g., "pending_tts", "processing_tts", "complete", "failed"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

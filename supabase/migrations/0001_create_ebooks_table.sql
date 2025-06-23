CREATE TABLE ebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Nullable for MVP, for future user accounts
    file_name TEXT,
    original_file_type TEXT, -- e.g., "txt", "epub", "pdf"
    title TEXT, -- Extracted or user-defined, optional
    status TEXT, -- e.g., "uploaded", "parsing", "processing_audio", "complete", "failed"
    extracted_text_preview TEXT, -- For TXT: full text; for EPUB/PDF: first ~1000 chars
    created_at TIMESTAMPTZ DEFAULT NOW()
);

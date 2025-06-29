-- 0009_add_part_number_to_chapters.sql

ALTER TABLE public.chapters
ADD COLUMN part_number INTEGER NOT NULL DEFAULT 1;

-- Add a composite unique constraint to prevent duplicate parts for the same chapter.
ALTER TABLE public.chapters
ADD CONSTRAINT chapters_ebook_id_chapter_number_part_number_key
UNIQUE (ebook_id, chapter_number, part_number);

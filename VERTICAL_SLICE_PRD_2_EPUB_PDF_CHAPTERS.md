# Vertical Slice PRD 2: EPUB, PDF Support & Chapterization

**Parent Document:** `PRD.md`, `DEVELOPMENT_PLAN.md` (Phase 3)
**Depends On:** Successful completion of Vertical Slice 1 (TXT Upload to Audio Playback)

## 1. Introduction & Goal

This document outlines the product requirements for the second major vertical slice. The primary goal is to expand file type support to include EPUB and PDF, and to introduce chapter-based processing and playback. This will allow users to convert more complex documents and navigate the generated audio in a structured manner.

## 2. Scope

### 2.1. In Scope

- **Frontend:**
    - UI for `.epub` and `.pdf` file upload (extending existing file upload).
    - Client-side parsing of EPUB files (using EPUBjs) to extract text content and identify chapter structure for preview.
    - Display of extracted text and identified chapters from EPUB for user preview.
    - Display of extracted text from PDF (full text initially, chapter display if feasible from backend).
    - UI to display a list of chapters/sections.
    - Ability to select and play audio for individual chapters.
    - Highlighting or indication of the currently playing chapter.
- **Backend (Supabase Edge Functions):**
    - Endpoint(s) to receive `.epub` and `.pdf` files.
    - Server-side text extraction from PDF files.
    - Server-side text extraction and chapter identification from EPUB files (can re-validate/process structure identified by client-side EPUBjs or do full server-side parsing).
    - Logic to split the extracted text into chapters/sections based on identified structure (EPUB) or heuristics (PDF, e.g., by page or large text blocks if chapters aren't explicit).
    - For each chapter/section:
        - Call ElevenLabs API to generate audio.
        - Store each chapter's audio as a separate MP3 file in Supabase Storage (e.g., `ebook_id/chapter_1.mp3`, `ebook_id/chapter_2.mp3`).
    - Store chapter metadata (e.g., chapter number, title, audio URL) in Supabase PostgreSQL (`audio_chapters` table, linked to an `ebooks` table entry).
    - Endpoint to return the list of chapters (with titles and audio URLs) to the frontend for a given ebook.

### 2.2. Out of Scope for This Slice

- Advanced PDF parsing (e.g., complex layouts, scanned images - focus on text-based PDFs).
- User editing of chapter titles or boundaries.
- Merging/splitting of chapters by the user.
- Audio download functionality (addressed in next slice).
- Synchronized text highlighting during audio playback.

## 3. User Stories

- **US2.1:** As a user, I want to upload an EPUB file, so that I can convert my ebook into a chapterized audiobook.
- **US2.2:** As a user, I want to upload a PDF file containing a book or long document, so that I can convert it into an audiobook, ideally sectioned for easier listening.
- **US2.3 (EPUB):** As a user, I want to see the chapter titles extracted from my EPUB file before generating audio, so I can verify the structure.
- **US2.4:** As a user, I want the generated audiobook to be split into chapters/sections, so I can easily navigate and listen to specific parts.
- **US2.5:** As a user, I want to see a list of available chapters/sections for my audiobook, so I can choose which one to play.
- **US2.6:** As a user, I want to click on a chapter in the list to start playing its audio.
- **US2.7:** As a user, I want the application to remember (or indicate) which chapter I am currently listening to.

## 4. Functional Requirements

### 4.1. Frontend

- **FR2.1 (File Input - EPUB/PDF):** The file input control shall be updated to accept `.epub` and `.pdf` files in addition to `.txt`.
- **FR2.2 (EPUB Parsing - Client):** Upon EPUB file upload, the system shall use EPUBjs to parse the file client-side.
    - It shall extract the full text content.
    - It shall attempt to identify chapter breaks and titles from the EPUB's Table of Contents or structure.
- **FR2.3 (Text & Chapter Preview - EPUB):** The system shall display the extracted text from the EPUB. If chapters are identified, their titles and order should be previewable.
- **FR2.4 (Text Preview - PDF):** The system shall display the extracted text from the PDF (as returned by the backend after server-side extraction) for preview.
- **FR2.5 (Chapter List Display):** After audio generation, the system shall display an ordered list of chapters/sections for the audiobook.
    - Each item in the list should display the chapter number/title.
- **FR2.6 (Chapter Playback):** Clicking a chapter in the list shall load and play the audio for that specific chapter in the audio player.
- **FR2.7 (Current Chapter Indication):** The UI shall visually indicate which chapter is currently loaded or playing.

### 4.2. Backend (Supabase Edge Functions)

- **FR2.8 (EPUB/PDF Reception & Validation):** The `upload-ebook` (Version 2) Edge Function shall accept `.epub` and `.pdf` files.
    - It shall validate file types.
    - It shall store the uploaded ebook file in Supabase Storage (`ebook-uploads` bucket).
    - It shall create an entry in the `ebooks` table in Supabase PostgreSQL.
- **FR2.9 (PDF Text Extraction - Server):** The Edge Function shall use a server-side library to extract all text content from PDF files.
- **FR2.10 (EPUB Text/Chapter Extraction - Server):** The Edge Function shall use a server-side library to extract text and chapter structure from EPUB files. This can serve as a primary source or a validation/refinement of client-side identified chapters.
- **FR2.11 (Chapterization Logic):**
    - For EPUBs: Utilize the identified chapter structure.
    - For PDFs (and TXT if not already chapterized): Implement basic heuristics to split text into manageable sections if no explicit chapters are found (e.g., by a certain character/word count, or based on common heading patterns if detectable, though this is advanced).
- **FR2.12 (Chapter-based TTS):** The `generate-audio` (Version 2) Edge Function will be responsible for TTS. For each identified chapter/section:
    - Call ElevenLabs API with the chapter's text and selected voice.
    - Store the generated audio MP3 in Supabase Storage (e.g., `audiobook-outputs/ebook_id/chapter_X.mp3`).
    - Create an entry in the `audio_chapters` table in PostgreSQL, linking to the `ebooks` table, and storing chapter number, title (if available), and the audio file URL.
- **FR2.13 (Return Chapter List):** The `get-audiobook-details` Edge Function shall return a list of all processed chapters (metadata including title, audio URL) for a given `ebook_id`.

## 5. Non-Functional Requirements (for this slice)

- **NFR2.1 (Performance - Extraction):** Text extraction from moderately sized EPUB/PDF files (e.g., 200 pages) should complete within a reasonable timeframe (e.g., 30-60 seconds, highly dependent on server-side library performance).
- **NFR2.2 (Accuracy - Chapterization):** Chapter identification for well-structured EPUBs should be highly accurate. For PDFs, sectioning should be logical even if not perfectly aligned with visual chapters.

## 6. Acceptance Criteria

- **AC2.1:** User can successfully upload an EPUB file, preview its content and identified chapters, select a voice, generate audio, and play back individual chapters from a list.
- **AC2.2:** User can successfully upload a PDF file, preview its extracted text, select a voice, generate audio, and play back individual sections/chapters from a list.
- **AC2.3:** Chapter list is displayed correctly with titles (where available) and allows selection for playback.
- **AC2.4:** Audio for each chapter is generated and stored as a separate file.
- **AC2.5:** `ebooks` and `audio_chapters` tables in Supabase PostgreSQL are correctly populated with ebook metadata and chapter details (including audio URLs).
- **AC2.6:** The system correctly handles cases where EPUB/PDF parsing or chapter identification might yield limited or no structure (e.g., falls back to treating as a single text block if necessary, similar to Slice 1).

## 7. Assumptions & Dependencies

- Server-side libraries for EPUB and PDF text/structure extraction are chosen and integrated.
- Database schema for `ebooks` and `audio_chapters` is defined and implemented.
- Core audio generation and playback functionality from Slice 1 is stable.

This slice significantly enhances the application's utility by supporting common ebook formats and providing a more granular listening experience.

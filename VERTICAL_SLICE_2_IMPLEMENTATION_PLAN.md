# Vertical Slice 2: EPUB/PDF Upload, Basic Chapterization, and Batch Audio Generation - Implementation Plan

## 1. File Handling & Text Extraction (Backend & Frontend)

-   **1.1. Research Deno-compatible Libraries:**
    -   [x] **EPUB Library:** `epub-parse` (from npm, via esm.sh). Chosen for its lack of `fs` dependency and ability to parse a file buffer into structured chapters with HTML content.
    -   [x] **PDF Library:** `pdf-extraction` (from npm, via esm.sh). Chosen as it's a pure JS wrapper around `pdf.js`, works with file buffers, and is focused on text extraction.
-   **1.2. Backend: Update `upload-ebook` Edge Function**
    -   [ ] **Import Libraries:** Add imports for `epub-parse` and `pdf-extraction` from `https://esm.sh`.
    -   [ ] **Update Request Handling:** The function already handles `multipart/form-data`. Add logic to differentiate between `txt`, `epub`, and `pdf` based on the file's `type` or `name`.
    -   [ ] **File Processing Logic:**
        -   **If `epub`:**
            -   Read the uploaded file into a buffer.
            -   Pass the buffer to `epub-parse`.
            -   Store the original EPUB file in the `ebook-uploads` bucket.
        -   **If `pdf`:**
            -   Read the uploaded file into a buffer.
            -   Pass the buffer to `pdf-extraction` to get the raw text.
            -   Store the original PDF file in the `ebook-uploads` bucket.
    -   [ ] **Update `ebooks` Table Record:**
        -   Set `file_name` to the uploaded file's name.
        -   Set `original_file_type` to "epub" or "pdf".
        -   Store the first ~1000 characters of the extracted text in `ebooks.extracted_text_preview`.
        -   Set `status` to "pending_chapterization".
-   **1.3. Frontend: Update `FileUpload.tsx`**
    -   [ ] Modify the `<input type="file">` to include `.epub` and `.pdf` in its `accept` attribute (e.g., `accept=".txt,.epub,.pdf"`).
    -   [ ] Update any client-side validation logic to allow these new file types.

## 2. Chapterization Logic (Backend)

-   **2.1. Implement Chapter Extraction for EPUB (in `upload-ebook`):**
    -   [ ] After parsing with `epub-parse`, iterate through the resulting `sections` array.
    -   [ ] For each section, extract the chapter `title` (if available from the `structure` object) and the raw HTML content.
    -   [ ] **Convert HTML to Plain Text:** Use a simple regex or a lightweight library to strip HTML tags from the content to get plain text for TTS.
    -   [ ] Prepare a `chapters` record object for each section.
-   **2.2. Implement Basic Chapter Splitting for PDF/TXT (in `upload-ebook`):**
    -   [ ] After extracting raw text with `pdf-extraction` (or from a TXT file), apply a splitting heuristic.
    -   [ ] **Primary Strategy:** Use a regular expression to find lines matching patterns like `Chapter [number/roman numeral]`, `CHAPTER [number/roman numeral]`, or `Part [number/roman numeral]`. Split the text at these points.
    -   [ ] **Fallback Strategy:** If no chapter markers are found, treat the entire text as a single chapter titled "Chapter 1".
    -   [ ] For each identified/split section, prepare a `chapters` record object (e.g., `title` will be the matched "Chapter X" string).
-   **2.3. Backend: Update `upload-ebook` (or v2) for Chapter Creation:**
    -   [ ] After text extraction (1.2) and chapter identification (2.1/2.2), iterate through identified chapters.
    -   [ ] For each chapter, create a new record in the `chapters` table:
        -   `ebook_id`: Link to the parent ebook.
        -   `chapter_number`: Sequential number.
        -   `title`: Extracted/generated chapter title.
        -   `text_content`: Text content of the chapter.
        -   `status`: "pending_tts".
    -   [ ] Update parent `ebooks` record `status` to "pending_tts_batch" or similar after all chapters are created.
    -   [ ] Modify response to include the `ebook_id` and a list of created `chapter_ids` or a count.

## 3. Batch Audio Generation (Backend)

-   **3.1. Design & Implement `generate-audio-batch` Edge Function (or evolve `generate-audio-from-text` to v2):**
    -   [ ] Define request: POST with `ebook_id` and `voice_id`.
    -   [ ] Fetch all `chapters` records for the given `ebook_id` with `status: "pending_tts"`.
    -   [ ] Update `ebooks.status` to "processing_tts_batch".
    -   [ ] Loop through each chapter:
        -   [ ] Update `chapters.status` to "processing_tts".
        -   [ ] Call ElevenLabs API with chapter's `text_content` and `voice_id`.
        -   [ ] Handle ElevenLabs API response (success/error).
        -   [ ] If successful, upload audio to Supabase Storage: `audiobook-outputs/ebooks/{ebook_id}/chapters/{chapter_id}.mp3`.
        -   [ ] Update `chapters` record: `audio_url`, `status: "audio_generated"`.
        -   [ ] If ElevenLabs call or upload fails, update `chapters.status` to "tts_failed", log error.
    -   [ ] After processing all chapters, determine overall ebook status (e.g., "processing_complete" if all chapters succeeded, "processing_partial_error" if some failed, "processing_failed" if all failed).
    -   [ ] Update `ebooks.status` accordingly.
    -   [ ] Define response: Summary object (e.g., `ebook_id`, `overall_status`, `chapters_processed`, `chapters_succeeded`, `chapters_failed`, list of individual chapter statuses with `chapter_id`, `status`, `audio_url` if successful).

## 4. Frontend UI Updates for VS2

-   **4.1. Ebook Detail/Chapter List View:**
    -   [ ] Create a new component or page to display details of an uploaded ebook and its list of chapters (title, number, status).
    -   [ ] Fetch ebook details and chapter list when an ebook is selected/uploaded.
-   **4.2. Trigger Batch Audio Generation:**
    -   [ ] Add a button (e.g., "Generate Full Audiobook") on the ebook detail view.
    -   [ ] On click, call the `generate-audio-batch` Edge Function with `ebook_id` and selected `voice_id`.
-   **4.3. Display Generation Status:**
    -   [ ] Display overall audio generation status for the ebook.
    -   [ ] Display individual chapter generation statuses in the chapter list.
    -   *(Consider basic polling or a manual refresh for status updates in MVP; Realtime for VS3)*.
-   **4.4. Chapter Audio Playback:**
    -   [ ] For chapters with `status: "audio_generated"`, provide a way to play the audio (e.g., a play button next to each chapter that uses the `audio_url`).
    -   [ ] Integrate a simple HTML5 `<audio>` player or a lightweight audio player component.

## 5. Database Schema Updates (if any beyond `audio_url`)

-   [ ] Review if any new columns are needed in `ebooks` or `chapters` tables (e.g., more detailed status fields, chapter titles if not implicitly handled by `text_content` parsing). `chapters.title` seems necessary.
-   [ ] If `chapters.title` is added, create a new migration.

## 6. Testing for VS2

-   [ ] Unit/integration tests for new parsing/chapterization logic.
-   [ ] End-to-end tests for EPUB upload and audio generation.
-   [ ] End-to-end tests for PDF upload and audio generation.
-   [ ] Test various scenarios: files with/without clear chapter markers, empty files, very large files (consider limits).

# AI Audiobook Web App - Consolidated Implementation Plan

## 0. Introduction

-   **Purpose**: This document serves as the single source of truth for the development of the AI Audiobook Web App, merging and superseding previous planning documents like `DEVELOPMENT_PLAN.md`, `IMPLEMENTATION_GUIDE.md`, and aspects of `MVP_IMPLEMENTATION_PLAN.md`.
-   **Guiding Documents**: `ARCHITECTURE.md`, `TECH_STACK.md`, `PRD.md`, and the individual `VERTICAL_SLICE_PRD_*.md` files.
-   **General Approach**: Development will follow a vertical slice methodology, emphasizing iterative progress, frequent testing, and continuous integration.
-   **Core Technologies**: Vite, React, TypeScript, Material UI, Tailwind CSS for the frontend; Supabase (PostgreSQL, Storage, Edge Functions) for the backend; ElevenLabs API for TTS.

## 1. Foundational Setup (Corresponds to original Development Plan - Phase 1)

### 1.1. Project Initialization

-   **Repository**: Initialize a Git monorepo. Create a `frontend` subdirectory for the React application and a `supabase/functions` directory for Edge Functions.
-   **Standard Files**: Include `README.md`, `LICENSE` (MIT, Copyright Anastasia Kim), `.gitignore`.

### 1.2. Frontend Tooling & Configuration

-   **Scaffolding**: Set up the `frontend` project using Vite with the React + TypeScript template (as detailed in `MVP_IMPLEMENTATION_PLAN.md`, Step 1.1).
-   **Core Dependencies**: Install Material UI (`@mui/material @emotion/react @emotion/styled @mui/icons-material`), Tailwind CSS (`tailwindcss postcss autoprefixer`), React Router (`react-router-dom`), Redux Toolkit (`@reduxjs/toolkit react-redux`), React Query (`@tanstack/react-query`), and Axios (`axios`) (as per `MVP_IMPLEMENTATION_PLAN.md`, Step 1.2).
-   **Styling Configuration**: Configure Tailwind CSS (`tailwind.config.js`, `postcss.config.js`, directives in `src/index.css`) and Material UI (basic `ThemeProvider`) (as per `MVP_IMPLEMENTATION_PLAN.md`, Steps 1.3 & 1.4).
-   **Code Quality**: Set up ESLint, Prettier for linting and formatting.
-   **Git Hooks**: Implement Husky for pre-commit checks (linting, tests).

### 1.3. Supabase Project Setup

-   **Project Creation**: Create a new project on the Supabase Dashboard.
-   **Database Schema**:
    -   `ebooks` table: `id` (UUID PK), `user_id` (UUID, nullable for MVP, for future user accounts), `file_name` (TEXT, original uploaded file name), `original_file_type` (TEXT, e.g., "txt", "epub", "pdf"), `title` (TEXT, extracted or user-defined, optional), `status` (TEXT, e.g., "uploaded", "parsing", "processing_audio", "complete", "failed"), `extracted_text_preview` (TEXT, for TXT: full text; for EPUB/PDF: first ~1000 chars of extracted text), `created_at` (TIMESTAMPTZ DEFAULT NOW()).
    -   `chapters` table: `id` (UUID PK), `ebook_id` (UUID FK REFERENCES `ebooks(id)`), `chapter_number` (INT), `title` (TEXT, optional, extracted from EPUB or generated), `text_content` (TEXT, full text of the chapter), `audio_url` (TEXT, URL to the generated MP3 in Supabase Storage), `audio_duration_seconds` (INT, optional), `status` (TEXT, e.g., "pending_tts", "processing_tts", "complete", "failed"), `created_at` (TIMESTAMPTZ DEFAULT NOW()).
-   **Storage Buckets**:
    -   `ebook-uploads`: For storing raw uploaded TXT, EPUB, PDF files. Configure as private.
    -   `audiobook-outputs`: For storing generated MP3 audio chapters. Configure for public read access for the MVP.
-   **Environment Variables**: Securely configure Supabase Project URL, `anon` key (for frontend), `service_role` key (for backend Edge Functions), and ElevenLabs API Key (for backend Edge Functions) in appropriate `.env` files and Supabase project settings.
-   **Supabase CLI**: Install and link the Supabase CLI to the project for local development and deployment of Edge Functions.

### 1.4. Basic Frontend Application Structure

-   **Directory Layout**: Follow the example structure outlined in `IMPLEMENTATION_GUIDE.md` (Section 2.1), including `components/`, `pages/`, `services/`, `store/`, `hooks/`, etc.
-   **Basic Routing**: Implement basic application routing using React Router, with a `HomePage.tsx` for the root path (as per `MVP_IMPLEMENTATION_PLAN.md`, Step 1.5).

## 2. Vertical Slice 1: TXT Upload to Audio Playback (Corresponds to original Development Plan - Phase 2)

**Goal**: Implement the end-to-end flow for uploading/pasting TXT, selecting a voice, generating a single audio file for the entire text, and playing it back.
**Detailed Steps**: For highly granular, step-by-step instructions for this slice, refer to `MVP_IMPLEMENTATION_PLAN.md` (Phases 2, 3, 4, and 5). This section summarizes the core components and backend logic.

### 2.1. Frontend: Text Input & Voice Selection

-   Develop `TextInputArea.tsx` for pasting text.
-   Develop `FileUpload.tsx` for `.txt` file uploads.
-   Implement a preview area on `HomePage.tsx` to display the input text.
-   Develop `VoiceSelection.tsx` with a hardcoded list of 3-5 ElevenLabs voices.

### 2.2. Backend: Core Logic & Edge Functions

-   **Edge Function: `upload-ebook` (Version 1 - TXT focus)**
    -   **Trigger**: POST request from frontend with `inputText` (string from paste) or `file` (multipart/form-data for .txt upload).
    -   **Actions**:
        1.  Validate input (text not empty, file is .txt if provided).
        2.  If `file` provided, read its content.
        3.  Store the raw .txt file in `ebook-uploads` Supabase Storage (optional for TXT, but good for consistency).
        4.  Create a new record in the `ebooks` table: (`original_file_type`: "txt", `status`: "uploaded", `extracted_text_preview`: full input text).
        5.  Create a single record in the `chapters` table: (`ebook_id` links to new ebook, `chapter_number`: 1, `text_content`: full input text, `status`: "pending_tts").
    -   **Response**: Return `ebook_id` and the `chapter_id` of the created chapter record.

-   **Edge Function: `generate-audio-from-text` (Version 1 - Single Chapter/Full Text)**
    -   **Trigger**: POST request from frontend with `chapter_id` and `voice_id`.
    -   **Actions**:
        1.  Update `chapters` status to "processing_tts".
        2.  Retrieve `text_content` for the given `chapter_id` from the `chapters` table.
        3.  Call ElevenLabs API with the `text_content` and `voice_id`.
        4.  Receive audio stream/file from ElevenLabs.
        5.  Upload the MP3 audio to `audiobook-outputs` bucket (e.g., `ebook_id/chapter_1.mp3`).
        6.  Update the `chapters` record with the `audio_url` and `status`: "complete".
        7.  Update the parent `ebooks` record `status` to "complete".
    -   **Response**: Return the `audio_url` and chapter metadata.

### 2.3. Frontend: Integration & Playback

-   Add a "Generate Audio" button on `HomePage.tsx`.
-   On click, first call `upload-ebook` (if new text/file), then use the returned `chapter_id` to call `generate-audio`.
-   Use React Query for managing API call states (loading, success, error).
-   Display loading indicators and error messages appropriately.
-   Render an HTML5 `<audio>` player to play the `audio_url` received from `generate-audio`.

## 3. Vertical Slice 2: EPUB, PDF Support & Chapterization (Corresponds to original Development Plan - Phase 3)

**Note**: Before coding begins, a more granular, step-by-step implementation plan (similar to `MVP_IMPLEMENTATION_PLAN.md`) will be created for this slice.

**Goal**: Extend file support to EPUB and PDF, implement chapter-based text extraction, audio generation, and playback.

### 3.1. Frontend: Enhanced File Handling & Chapter Display

-   Update `FileUpload.tsx` to accept `.epub` and `.pdf` files.
-   **EPUB Client-Side Preview**: Integrate EPUBjs. On EPUB upload:
    -   Parse file client-side to extract text and chapter structure (Table of Contents).
    -   Display this preview to the user.
-   **Chapter List UI**: Develop a component to display a list of chapters (number, title) for a processed ebook.
-   Allow users to select individual chapters from the list to play their audio.
-   Visually indicate the currently playing chapter.

### 3.2. Backend: Advanced Processing & Edge Functions

-   **Edge Function: `upload-ebook` (Version 2 - EPUB/PDF/TXT)**
    -   **Trigger**: POST request with `file` (EPUB, PDF, or TXT).
    -   **Actions**:
        1.  Validate file type.
        2.  Store the raw uploaded file in `ebook-uploads` bucket.
        3.  Create an initial record in `ebooks` table (`original_file_type`, `file_name`, `status`: "parsing").
        4.  **For EPUB**: Use a server-side EPUB parsing library (researching a suitable Deno-compatible library is part of this task) to extract text content and chapter structure (titles, order). For each identified chapter, create a record in the `chapters` table (`ebook_id`, `chapter_number`, `title`, `text_content`, `status`: "pending_tts").
        5.  **For PDF**: Use a server-side PDF text extraction library (researching a suitable Deno-compatible library is part of this task). Implement advanced heuristics (e.g., detecting large font headings, chapter markers) to split the extracted text into logical sections/chapters. For each section, create a record in the `chapters` table, using a generated title like "Chapter X".
        6.  **For TXT**: If the single-chapter approach for TXT is kept, this function might create one chapter. Or, apply similar advanced heuristics as PDF for sectioning if desired.
        7.  Update `ebooks` status to "pending_tts_chapters" (or similar, indicating chapters are defined and ready for audio generation).
    -   **Response**: Return `ebook_id` and a list of identified chapter structures (id, number, title) for frontend display.

-   **Edge Function: `generate-audio` (Version 2 - Batch/Individual Chapter Processing)**
    -   **Trigger**: Can be POST request with `ebook_id` (to process all its pending chapters) or `chapter_id` (to process a specific chapter) and `voice_id`.
    -   **Actions**: Similar to Version 1, but iterates through specified chapters:
        1.  For each target chapter, update its status to "processing_tts".
        2.  Retrieve `text_content`, call ElevenLabs, store audio, update `chapters` record with `audio_url` and status "complete".
        3.  Once all requested chapters are processed, update the main `ebooks` record status if all its chapters are complete.
    -   **Response**: Return a summary of the operation, including a count of successful/failed chapters and a list of individual chapter statuses.

-   **Edge Function: `get-audiobook-details`**
    -   **Trigger**: GET request with `ebook_id`.
    -   **Actions**: Retrieve the ebook metadata from `ebooks` table and all associated chapter details (id, number, title, audio_url, duration, status) from the `chapters` table.
    -   **Response**: Return JSON object with ebook and chapter data.

### 3.3. Frontend: Chapter-Based Playback Workflow

-   After `upload-ebook` (for EPUB/PDF), use `get-audiobook-details` to fetch and display the chapter list.
-   User selects a voice and initiates audio generation (can be for all chapters or allow per-chapter generation later).
-   Frontend calls `generate-audio` (likely for the whole `ebook_id`).
-   Use Supabase Realtime to listen for changes to the `chapters` table and update chapter statuses and enable playback as audio becomes available.
-   User clicks a chapter in the list to play its specific `audio_url` in the player.

## 4. Vertical Slice 3: Download Functionality & UI/UX Polish (Corresponds to original Development Plan - Phase 4)

**Note**: Before coding begins, a more granular, step-by-step implementation plan will be created for this slice.

**Goal**: Allow users to download generated audio and significantly improve the application's overall look, feel, and usability.

### 4.1. Frontend: Download Features & UI Enhancements

-   **Download Button**: Add a download icon/button next to each chapter in the list.
    -   Clicking it should download the corresponding MP3 file (filename: `[EbookTitle]_Chapter_[Number]_[ChapterTitle].mp3`).
-   **(Optional Stretch Goal) Download All**: Implement a "Download All Chapters" button.
    -   This would trigger a backend process to ZIP all chapters.
-   **UI/UX Polish**: Conduct a thorough review and implement improvements:
    -   **Styling**: Consistent Material UI theming and Tailwind CSS utility application.
    -   **Layout**: Improved spacing, typography, and visual hierarchy.
    -   **User Feedback**: Enhanced loading states (e.g., progress indicators for multi-chapter generation), success/error notifications (e.g., using toasts via a library like `react-toastify` or MUI's Snackbar).
    -   **Responsiveness**: Ensure the application is fully responsive across common device sizes (desktop, tablet, mobile).
    -   **Accessibility (A11y)**: Apply ARIA attributes, ensure keyboard navigability, sufficient color contrast.

### 4.2. Backend: Download Support

-   **Audio File Accessibility**: Ensure MP3 files in `audiobook-outputs` are downloadable. If the bucket is public, direct URLs work. If private, the download button might trigger an Edge Function that generates and returns a short-lived signed URL for the specific file.
-   **(Optional Stretch Goal) ZIP Generation Edge Function (`zip-chapters`)**:
    -   **Trigger**: POST request with `ebook_id`.
    -   **Actions**: Retrieve all `audio_url`s for the ebook's chapters. Fetch the audio files from storage. Create a ZIP archive containing these MP3s. Upload the ZIP to a temporary location in storage or stream it back.
    -   **Response**: URL to the ZIP file or the ZIP file stream.

### 4.3. Analytics (Basic Client-Side)

-   Implement basic client-side logging for key events (file upload type, audio generation start/success/fail, chapter download) using `console.log` or a simple analytics hook for MVP.

## 5. General Testing Strategy

-   **Unit Tests (Jest/Vitest + React Testing Library)**: For individual React components, custom hooks, Redux slices, and utility functions.
-   **Integration Tests**:
    -   **Frontend**: Test interactions between components and mocked API services (e.g., using Mock Service Worker).
    -   **Backend**: Test Edge Functions locally using the Supabase CLI, mocking Supabase client responses and ElevenLabs API calls where necessary.
-   **End-to-End (E2E) Tests (Optional for early MVP, consider Cypress or Playwright later)**: Simulate full user workflows through the UI against a test/staging Supabase environment.
-   **Manual QA**: Thorough manual testing of all features on target browsers and devices.

## 6. Deployment Strategy

-   **Frontend (React App)**: Deploy static assets (after `npm run build`) to Vercel or Netlify.
    -   Configure environment variables (Supabase URL, anon key) in the hosting provider's settings.
-   **Backend (Supabase Edge Functions)**: Deploy using the Supabase CLI (`supabase functions deploy <function_name>`).
    -   Configure environment variables (ElevenLabs API key, Supabase service_role key) in the Supabase project dashboard.
-   **CI/CD**: Set up GitHub Actions (or similar) to automate linting, testing, building, and deployment on pushes/merges to main/production branches.

## 7. Security & Best Practices

-   **API Keys**: Strictly manage ElevenLabs API key and Supabase `service_role` key in backend environment variables. Never expose them client-side.
-   **Input Validation**: Implement robust validation on both frontend (initial checks) and backend (comprehensive checks in Edge Functions).
-   **Supabase Row Level Security (RLS)**: Plan for and implement RLS when user accounts are introduced. For MVP without user accounts, ensure storage bucket policies are correctly configured (e.g., `ebook-uploads` private, `audiobook-outputs` public read or accessed via signed URLs).
-   **Error Handling**: Consistent and user-friendly error handling on the frontend. Clear error responses and logging from backend Edge Functions.
-   **Coding Standards**: Adhere to `VIBE_CODING.md`, ESLint/Prettier rules, and general best practices for React, TypeScript, and Node.js/Deno (for Edge Functions).

This consolidated plan provides a comprehensive roadmap. Specific, highly detailed step-by-step instructions for Vertical Slice 1 can be found in `MVP_IMPLEMENTATION_PLAN.md`. Similar detailed breakdowns can be created for subsequent slices if deemed necessary by the development team.

## Done! MVP built. Adjusted.
## test

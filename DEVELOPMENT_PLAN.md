# Step-by-Step Actionable Development Plan (Vertical Slice Approach)

## Phase 1: Project Setup & Core Infrastructure
1. **Initialize Repositories**
   - Set up monorepo or separate repos for frontend and edge functions.
   - Initialize with README, LICENSE, and `.gitignore`.

2. **Configure Tooling**
   - Set up TypeScript, ESLint, Prettier, and Husky for both frontend and backend.
   - Add Jest and React Testing Library for frontend tests.
   - Add CI pipeline (GitHub Actions) for linting and tests.

3. **Set Up Supabase**
   - Create Supabase project.
   - Set up PostgreSQL tables: `ebooks`, `audiobooks`, (optionally `analytics`).
   - Configure Supabase Storage buckets.
   - Set up Row Level Security (RLS) policies (if needed for future auth).

---

## Phase 2: First Vertical Slice – Upload to Audio Playback

**Goal:** Deliver the end-to-end flow for uploading a `.txt` file, converting a small text sample to audio, and playing it back.

1. **Frontend: File Upload UI**
   - Build a simple upload component (accept `.txt` only for this slice).
   - Show file name and size after selection.
   - Validate file type and size.

2. **Backend: Edge Function for Upload**
   - Create `/upload-ebook` edge function.
   - Accept file, validate, store in Supabase Storage, extract text (for `.txt`, just read).
   - Return extracted text and file metadata.

3. **Frontend: Display Extracted Text**
   - Show extracted text in a read-only preview area.
   - Handle and display errors (invalid file, extraction failure).

4. **Frontend: Voice Selection UI**
   - Hardcode 2-3 ElevenLabs voices in a dropdown.
   - Allow user to select a voice.

5. **Backend: Edge Function for TTS**
   - Create `/convert-to-audio` edge function.
   - Accept text and voice, call ElevenLabs API, store audio in Supabase Storage.
   - Return audio file URL.

6. **Frontend: Audio Playback**
   - Display audio player with returned audio file.
   - Show loading/progress indicator during conversion.

7. **Testing**
   - Write unit tests for upload and audio player components.
   - Write integration test for the upload-to-audio flow.

---

## Phase 3: Expand File Support & Chapterization

1. **Frontend: Support EPUB and PDF**
   - Update upload component to accept `.epub` and `.pdf`.
   - Integrate EPUBjs for client-side parsing (for preview).
   - For PDF, use a lightweight parser or send to backend for extraction.

2. **Backend: Enhanced Text Extraction**
   - Update `/upload-ebook` to handle EPUB and PDF extraction.
   - Return chapters/sections if detected.

3. **Frontend: Chapter Navigation**
   - Display chapters/sections in a list.
   - Allow user to select and play/download each chapter.

4. **Backend: Chapterized TTS**
   - Update `/convert-to-audio` to process and return audio for each chapter/section.

---

## Phase 4: Download & Analytics

1. **Frontend: Download Buttons**
   - Add download button for each audio chapter.
   - Ensure files are named clearly (e.g., `Chapter_1.mp3`).

2. **Backend: Secure Audio Delivery**
   - Generate signed Supabase Storage URLs for downloads.

3. **Backend: Basic Analytics**
   - Log conversion events, file types, and voice selections in Supabase.

---

## Phase 5: Polish, QA, and Deployment

1. **UI/UX Polish**
   - Refine UI with MUI and Tailwind for responsiveness and accessibility.
   - Add clear error and loading states.

2. **Testing**
   - Expand test coverage (unit, integration, E2E).
   - Manual QA on all major browsers and devices.

3. **Documentation**
   - Update README, add usage instructions, and document environment variables.

4. **Deployment**
   - Deploy frontend to Vercel/Netlify.
   - Deploy edge functions to Supabase.
   - Set up environment variables and monitor logs.

---

## Phase 6: (Optional, If Time Allows)
- Add support for direct text input.
- Add basic analytics dashboard (admin only).
- Prepare for future user authentication.

---

# Summary Table

| Phase | Vertical Slice Goal                                 | Key Deliverables                        |
|-------|-----------------------------------------------------|-----------------------------------------|
| 1     | Project & infra setup                               | Repo, CI, Supabase, Supabase Storage, DB              |
| 2     | Upload `.txt` → TTS → Audio playback                | Upload UI, backend, TTS, audio player   |
| 3     | EPUB/PDF & chapterization                           | Multi-format support, chapter playback  |
| 4     | Download & analytics                                | Download buttons, event logging         |
| 5     | Polish, QA, deploy                                  | Responsive UI, tests, docs, deployment  |
| 6     | (Optional) Direct text input, analytics dashboard   | Extra features for future-proofing      |

---

**This plan ensures you always have a working, demonstrable product at each phase, and can adjust scope as needed.** 
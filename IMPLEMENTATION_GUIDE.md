# AI Audiobook Web App - Implementation Guide

This guide provides developers with a practical overview of how to implement the AI Audiobook Web App, building upon the information in `ARCHITECTURE.md`, `DEVELOPMENT_PLAN.md`, and `TECH_STACK.md`.

## 1. Project Setup

### 1.1. Repository Setup
- Initialize Git repository.
- Recommended: Monorepo structure if frontend and backend (Edge Functions) are closely tied, or separate repositories.
- Include standard files: `.gitignore`, `LICENSE`.

### 1.2. Tooling Configuration
- **TypeScript:** Configure `tsconfig.json` for both frontend (React) and backend (Supabase Edge Functions).
- **Linters & Formatters:** Set up ESLint and Prettier for consistent code style.
- **Git Hooks:** Use Husky for pre-commit checks (linting, tests).
- **Package Management:** Use npm or yarn.

### 1.3. Supabase Project Setup
- Create a new Supabase project via the [Supabase Dashboard](https://supabase.com/dashboard).
- **Database Schema:**
    - `ebooks` table: (e.g., `id` UUID PRIMARY KEY, `user_id` UUID (for future use, nullable for MVP), `file_name` TEXT, `file_type` TEXT, `status` TEXT, `extracted_text` TEXT, `created_at` TIMESTAMPTZ DEFAULT NOW())
    - `audio_chapters` table: (e.g., `id` UUID PRIMARY KEY, `ebook_id` UUID REFERENCES `ebooks`(id), `chapter_number` INT, `chapter_title` TEXT, `audio_url` TEXT, `duration_seconds` INT, `created_at` TIMESTAMPTZ DEFAULT NOW())
- **Storage Buckets:**
    - `ebook-uploads`: For storing uploaded TXT, EPUB, PDF files. (Consider making this private)
    - `audiobook-outputs`: For storing generated MP3 audio chapters. (Likely public read, or private with signed URLs for downloads)
    - Configure bucket policies accordingly.
- **Environment Variables:**
    - Securely store Supabase Project URL and `anon` key (for frontend) and `service_role` key (for backend Edge Functions) in environment variables (e.g., `.env` files, Vercel/Netlify environment settings).
    - Store ElevenLabs API Key securely in backend environment variables.

## 2. Frontend Implementation (React & TypeScript)

Refer to `TECH_STACK.md` for a full list of frontend technologies.

### 2.1. Directory Structure (Example)
```
src/
├── App.tsx
├── main.tsx
├── index.html
├── assets/
├── components/         # Reusable UI components (MUI based)
│   ├── common/         # Buttons, Modals, Loaders etc.
│   ├── layout/         # Header, Footer, Sidebar
│   └── features/       # Components specific to a feature
│       ├── upload/
│       ├── player/
│       └── voice_selection/
├── features/           # Feature-specific logic, hooks, pages & components (alternative to pages/)
├── hooks/              # Custom React hooks (e.g., useAudioPlayer)
├── pages/              # Top-level page components (React Router)
├── services/           # API client, Supabase client interactions (e.g., supabase.ts, elevenlabsService.ts)
├── store/              # Redux Toolkit store, slices, selectors
├── styles/             # Global styles, Tailwind config (tailwind.config.js, index.css)
├── types/              # TypeScript type definitions (e.g., global.d.ts, feature-specific types)
└── utils/              # Utility functions (e.g., text processing, file handling)
```

### 2.2. Core UI Components
- **Layout:** Main application shell (e.g., `Header`, `ContentArea`, `Footer`).
- **FileUpload:** Component for TXT, EPUB, PDF upload (using `<input type="file">`, potentially drag-and-drop).
- **TextPreview:** Display extracted text in a scrollable area.
- **VoiceSelector:** Dropdown/radio group for ElevenLabs voices.
- **ChapterList:** Display generated audio chapters with play/download options.
- **AudioPlayer:** HTML5 `<audio>` element or a custom player component for playback control.
- **DownloadButton:** For each chapter.

### 2.3. Styling
- Utilize **Material UI** for pre-built components, theming, and layout structure.
- Use **Tailwind CSS** for utility-first styling, custom layouts, and fine-grained control.
- Configure Tailwind to work alongside Material UI. Ensure Tailwind's preflight styles don't excessively override MUI defaults or use MUI's `CssBaseline` with Tailwind compatibility in mind.

### 2.4. State Management (Redux Toolkit)
- Define slices for:
    - `upload`: Manages uploaded file info, extracted text, identified chapters.
    - `voice`: Manages selected voice, list of available voices.
    - `audio`: Manages audio generation status (loading, progress), list of generated audio chapter URLs and metadata.
    - `ui`: Manages global UI state (e.g., modal visibility, notifications).

### 2.5. Data Fetching & Caching (React Query)
- Manage server state for interactions with Supabase Edge Functions.
- Use for fetching initial data (e.g., available voices), submitting conversion requests, and handling loading/error states for these API calls.
- Example queries/mutations:
    - `useMutation` for file upload to `/upload-ebook`.
    - `useMutation` for TTS conversion request to `/convert-to-audio`.
    - `useQuery` to fetch available voices (if dynamic from backend, e.g., `/list-voices`).

### 2.6. Routing (React Router)
- Define routes for main application views (e.g., `/` for home/upload, `/player/:ebookId` if a dedicated player page is desired).

### 2.7. EPUB Parsing (EPUBjs)
- Integrate EPUBjs on the client-side to parse EPUB files, extract text content, and identify chapter structure for preview before sending to the backend.

## 3. Backend Implementation (Supabase Edge Functions & TypeScript)

Edge Functions are written in TypeScript. Ensure Deno compatibility if using Deno runtime for Supabase Edge Functions.

### 3.1. Function Structure
- Organize Edge Functions by resource or main action (e.g., `ebook-processor`, `tts-generator`).
- Each function should handle a specific, well-defined task.
- Example: `supabase/functions/ebook-processor/index.ts`, `supabase/functions/tts-generator/index.ts`

### 3.2. Key Edge Functions (Examples from `DEVELOPMENT_PLAN.md`)
- **`ebook-processor` (handles `/upload-ebook` route via `serve`):**
    - Receives file (multipart/form-data).
    - Validates file type, size.
    - Stores the raw file in the `ebook-uploads` Supabase Storage bucket.
    - Extracts text content:
        - TXT: Read directly.
        - EPUB: Use a server-side EPUB parsing library (e.g., `epub` npm package if Node runtime, or find Deno equivalent).
        - PDF: Use a server-side PDF text extraction library (e.g., `pdf-parse` if Node, or Deno equivalent).
    - Stores extracted text and metadata in the `ebooks` PostgreSQL table.
    - Returns extracted text preview and `ebook_id`.
- **`tts-generator` (handles `/convert-to-audio` route via `serve`):**
    - Receives `ebook_id` (or text content directly), selected `voice_id`.
    - Retrieves extracted text/chapters from the `ebooks` table using `ebook_id`.
    - For each chapter/section:
        - Calls ElevenLabs API with the text and `voice_id`.
        - Receives audio stream/file from ElevenLabs.
        - Stores the audio file (MP3) in the `audiobook-outputs` Supabase Storage bucket (e.g., `ebook_id/chapter_1.mp3`).
        - Saves audio URL and metadata to the `audio_chapters` table.
    - Returns a list of audio chapter URLs and metadata.
- **`list-voices` (Optional, if voices are dynamic):**
    - Calls the ElevenLabs API (`/v1/voices`) to get available voices.
    - Returns the list of voices to the frontend.

### 3.3. Interacting with Supabase
- Use the Supabase JavaScript client library (`@supabase/supabase-js`) within Edge Functions.
- Initialize the client with Supabase URL and `service_role` key for privileged operations.
- **Database:** Perform CRUD operations on PostgreSQL tables.
- **Storage:** Upload files, generate signed URLs if needed for secure downloads from private buckets.

### 3.4. ElevenLabs API Integration
- Use an HTTP client (e.g., `fetch` API, available in Deno/Node) to interact with the ElevenLabs API.
- Securely manage the ElevenLabs API key using environment variables set in Supabase project settings.
- Handle API responses, errors, and potential rate limits.

## 4. Key Workflows (Vertical Slices)

### 4.1. Text Upload to Audio Playback
1.  **Frontend:** User uploads a file via UI.
2.  **Frontend:** React Query mutation sends file to `ebook-processor` Edge Function.
3.  **Backend (`ebook-processor`):** Validates, stores file in Supabase Storage, extracts text, saves metadata to `ebooks` table, returns preview text & `ebook_id`.
4.  **Frontend:** Displays preview. User selects voice, initiates conversion.
5.  **Frontend:** React Query mutation sends `ebook_id` & `voice_id` to `tts-generator` Edge Function.
6.  **Backend (`tts-generator`):** Retrieves text, calls ElevenLabs per chapter, stores MP3s in Supabase Storage, updates `audio_chapters` table, returns chapter audio URLs.
7.  **Frontend:** Displays chapter list with audio players. User plays/downloads.

## 5. Coding Standards & Best Practices

- **General:** Adhere to principles in `STYLE_GUIDE.md` and relevant files in `cursorrules/` (especially `cursorrules.txt`).
- **TypeScript:** Utilize strict typing, interfaces/types. Define clear data structures for API payloads and database records.
- **React:** Functional components, hooks, clear prop definitions, memoization where appropriate.
- **Error Handling:** Consistent strategy for frontend (user feedback, React Query error states) and backend (HTTP status codes, error responses from Edge Functions, logging).
- **Logging:** Use `console.log`/`console.error` in Edge Functions (viewable in Supabase Dashboard logs). For production, consider structured logging if needed.

## 6. Testing Strategy

- **Unit Tests (Jest/Vitest + React Testing Library):**
    - Frontend: Test individual React components, Redux slices, utility functions, custom hooks.
    - Backend: Test utility/helper functions within Edge Functions if logic is complex and can be isolated.
- **Integration Tests:**
    - Frontend: Test interactions between components and mocked API services (e.g., using Mock Service Worker).
    - Backend: Test Edge Functions by invoking them locally (Supabase CLI) with mock Supabase client responses and mock ElevenLabs API responses.
- **End-to-End Tests (Optional for MVP, e.g., Cypress, Playwright):**
    - Simulate full user workflows through the UI against a test/staging Supabase environment.

## 7. Deployment

- **Frontend (React App):**
    - Build static assets (`npm run build`).
    - Deploy to Vercel or Netlify.
    - Configure environment variables (Supabase URL, anon key).
- **Backend (Supabase Edge Functions):**
    - Deploy using the Supabase CLI (`supabase functions deploy <function_name> --project-ref <your-project-ref>`).
    - Configure environment variables in Supabase project dashboard (ElevenLabs API key, etc.).
- **CI/CD (e.g., GitHub Actions):**
    - Automate linting, testing, building, and deployment on pushes/merges to main/production branches.

## 8. Security Considerations

- **API Keys:** Never expose secret keys (ElevenLabs API key, Supabase `service_role` key) on the client-side. Store them securely in backend environment variables.
- **Input Validation:** Validate all user inputs on both frontend (basic checks) and backend (comprehensive checks in Edge Functions) to prevent errors and potential abuse.
- **Supabase Row Level Security (RLS):** Essential if/when user accounts are added. For MVP without user accounts, ensure storage bucket policies are correctly configured (e.g., public read for audio, private for uploads unless presigned URLs are used for uploads too).
- **Rate Limiting:** Be mindful of ElevenLabs API rate limits. Implement client-side controls to prevent rapid submissions. Supabase Edge Functions have some inherent concurrency limits.
- **HTTPS:** Ensured by Vercel/Netlify and Supabase.

This guide should serve as a starting point. Refer to the specific documentation for each technology in the stack for more detailed information.

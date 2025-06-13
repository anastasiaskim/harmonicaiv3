# Engineering Team Brief: AI Audiobook Web App MVP

## 1. Project Goal & Overview

Develop and deploy the AI Audiobook Web App MVP, enabling users to convert text (uploaded files or pasted) into audiobooks using ElevenLabs TTS. The application should be a responsive web app with a clean UI, focusing on the core workflow from text input to audio output.

**Primary Objective:** Deliver a functional MVP as outlined in `PRD.md` and `DEVELOPMENT_PLAN.md`.

## 2. Core Architecture & Tech Stack

Refer to `ARCHITECTURE.md` and `TECH_STACK.md` for full details.

- **Frontend:**
    - **Framework/Library:** React (likely with Vite or Create React App)
    - **Language:** TypeScript
    - **UI Components:** Material UI
    - **Styling:** Tailwind CSS
    - **State Management:** Redux Toolkit
    - **Data Fetching/Caching:** React Query
    - **Routing:** React Router
    - **EPUB Parsing:** EPUBjs (client-side for preview)

- **Backend:**
    - **Serverless Functions:** Supabase Edge Functions (TypeScript, Deno runtime)
    - **Database:** Supabase PostgreSQL
    - **Storage:** Supabase Storage (for ebook uploads and MP3 outputs)
    - **Text-to-Speech API:** ElevenLabs API

- **Infrastructure:**
    - **Frontend Hosting:** Vercel / Netlify
    - **Backend Services (DB, Storage, Functions):** Supabase

## 3. Key Technical Decisions & Considerations

- **Supabase as BaaS:** Leveraged for its integrated database, storage, and serverless functions, simplifying backend development for the MVP.
- **ElevenLabs API:** Chosen for high-quality, realistic AI voice generation.
- **Client-Side EPUB Parsing:** EPUBjs will be used on the frontend to extract text and chapter structure for user preview, reducing initial load on backend functions.
- **Server-Side Text Extraction:** Backend Edge Functions will handle robust text extraction from PDF and re-validate EPUBs before TTS.
- **Stateless Backend Functions:** Edge Functions should be designed to be stateless where possible.

## 4. Development Plan Highlights

The project will follow a phased approach as detailed in `DEVELOPMENT_PLAN.md`:
- **Phase 1:** Project Setup & Core Infrastructure (Repositories, Tooling, Supabase config).
- **Phase 2:** First Vertical Slice – TXT Upload to Audio Playback.
- **Phase 3:** Expand File Support (EPUB, PDF) & Chapterization.
- **Phase 4:** Download Functionality & Basic Analytics (logging).
- **Phase 5:** UI/UX Polish, Comprehensive QA, and Deployment.

## 5. Implementation Guidance

**The `IMPLEMENTATION_GUIDE.md` is the primary resource for detailed implementation steps.** Key areas include:

- **Project Setup:** Detailed steps for repository, tooling, and Supabase project configuration (DB schema, storage buckets).
- **Frontend Structure:** Recommended directory layout, core components (FileUpload, TextPreview, VoiceSelector, ChapterList, AudioPlayer), state management with Redux Toolkit, data fetching with React Query.
- **Backend (Supabase Edge Functions):**
    - `ebook-processor`: Handles file uploads, validation, storage, text extraction, and DB updates.
    - `tts-generator`: Handles TTS requests, interacts with ElevenLabs, stores audio files, and updates DB.
    - Securely manage API keys (ElevenLabs, Supabase service_role) via environment variables.
- **Core Workflows:** Detailed flow for text upload to audio playback.

## 6. Coding Standards & Style

- Adhere to guidelines in `STYLE_GUIDE.md` and relevant files within the `cursorrules/` directory (especially `cursorrules.txt` for general clean code).
- **TypeScript:** Strict typing, well-defined interfaces/types for data models and API contracts.
- **React:** Functional components, hooks, efficient state management, and clear prop definitions.
- **Error Handling:** Implement robust error handling on both frontend (user feedback, React Query states) and backend (HTTP status codes, logged errors in Edge Functions).
- **Modularity & Reusability:** Design components and functions to be modular and reusable.

## 7. Testing Strategy

- **Unit Tests:** (Jest/Vitest + React Testing Library for frontend; isolated function tests for backend utilities).
- **Integration Tests:** (Mock Service Worker for frontend API interactions; local Supabase CLI testing for Edge Functions with mocked dependencies).
- Refer to `IMPLEMENTATION_GUIDE.md` for more details.

## 8. Deployment

- **Frontend:** Vercel / Netlify.
- **Backend:** Supabase CLI for Edge Functions.
- CI/CD pipeline (e.g., GitHub Actions) should be set up for automated builds, tests, and deployments.

## 9. Key Documents for Engineering Team

- **`PRD.md`:** Understand *what* needs to be built (features, acceptance criteria).
- **`ARCHITECTURE.md`:** Understand the overall system structure and design principles.
- **`TECH_STACK.md`:** Definitive list of all technologies to be used.
- **`DEVELOPMENT_PLAN.md`:** Phased approach and deliverables for each stage.
- **`IMPLEMENTATION_GUIDE.md`:** Detailed, step-by-step guidance for development tasks.
- **`STYLE_GUIDE.md` & `cursorrules/`:** Coding conventions and best practices.

This brief provides a technical starting point. Engineers are expected to thoroughly review the detailed documentation linked.

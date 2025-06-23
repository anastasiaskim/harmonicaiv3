# AI Audiobook Web App Architecture

## I. Architectural Principles

- **Separation of Concerns:** Distinct layers/modules for specific responsibilities.
- **Single Responsibility Principle:** Each module/class/function has one reason to change.
- **Loose Coupling:** Minimize dependencies between modules.
- **High Cohesion:** Group related functionality together.
- **Dependency Inversion Principle:** Depend on abstractions, not concrete implementations.
- **DRY:** Extract reusable components/functions to avoid duplication.
- **KISS:** Favor simple solutions.
- **YAGNI:** Avoid unnecessary features.
- **Modularity:** Design as independent, self-contained modules.
- **Testability:** Write code that is easy to test.
- **Scalability:** Design for increasing traffic/data.
- **Security:** Follow best practices to protect data and prevent attacks.

---

## II. Architectural Layers

1. **Presentation Layer (Front-End):**
    - Renders UI, handles user interactions.
    - React, TypeScript, Shadcn/UI, Tailwind CSS, Lucide-React, Sonner, React Router.
2. **Application Layer (Front-End & Back-End):**
    - Orchestrates app logic, coordinates modules.
    - Use cases, workflows, business rules.
    - TypeScript/JavaScript.
3. **Domain Layer (Back-End - Supabase Edge Functions):**
    - Core business logic and domain models.
    - Entities, value objects, domain services.
    - TypeScript.
4. **Infrastructure Layer (Back-End - Supabase):**
    - Access to external resources/services (DB, Supabase Storage, APIs).
    - Supabase Client, Supabase Storage, ElevenLabs API client, logging.
    - TypeScript.

---

## III. Component Diagram (Textual)

- **Front-End (React):**
    - UI Components (Shadcn/UI)
    - Routes (React Router)
    - Redux Store
    - React Query
    - API Client
- **Back-End (Supabase Edge Functions):**
    - API Endpoints
    - Use Cases / Workflows
    - Domain Logic
- **Supabase Infrastructure:**
    - PostgreSQL Database
    - Supabase Storage
    - Authentication (future)
- **External Services:**
    - ElevenLabs API

---

## IV. Data Flow

### End-to-End Workflow: Audiobook Generation

This section details the concrete data flow for the core feature: uploading a document and generating an audiobook. This flow has been validated end-to-end.

1.  **File Upload (Client-Side):**
    *   The user selects a file (TXT, EPUB, PDF) or pastes text into the `HomePage.tsx` component.
    *   Upon clicking "Generate Audiobook", the `handleSubmit` function in `HomePage.tsx` is triggered.

2.  **Ebook Processing (Backend - `upload-ebook` Edge Function):**
    *   The frontend calls the `upload-ebook` Supabase Edge Function.
    *   This function parses the input, determines the number of chapters, and performs two database operations:
        *   Inserts a single record into the `ebooks` table.
        *   Inserts one or more records into the `chapters` table, each linked to the new ebook ID and with an initial status of `pending_tts`.
    *   The function returns the new ebook ID and chapter details to the frontend.

3.  **Realtime Subscription (Client-Side):**
    *   Upon receiving the new `ebookId`, the `useEffect` hook in `HomePage.tsx` triggers.
    *   It establishes a Supabase Realtime subscription, listening for any changes (`*`) on the `chapters` table where `ebook_id` matches the current one.

4.  **Audio Generation (Backend - `generate-audio-batch` Edge Function):**
    *   Once the Realtime subscription status is `SUBSCRIBED`, a callback in `HomePage.tsx` fires, calling the `generate-audio-batch` Edge Function with the `ebookId`.
    *   The `generate-audio-batch` function fetches all chapters for the ebook with a `pending_tts` status.
    *   It iterates through each chapter:
        *   Calls the ElevenLabs API to generate the audio speech from the chapter's text.
        *   Uploads the returned audio file to the `audiobook-outputs` Supabase Storage bucket.
        *   Updates the corresponding chapter row in the `chapters` table, setting the `status` to `complete` (or `error_tts` on failure) and saving the public `audio_url`.

5.  **UI Update (Client-Side via Realtime):**
    *   The `UPDATE` operation on the `chapters` table in the previous step is broadcast by Supabase Realtime.
    *   The active subscription in `HomePage.tsx` receives the payload containing the updated chapter data.
    *   The event handler updates the component's state (`chapters`), which causes React to re-render the `ChapterList` component, displaying the new status (e.g., "complete") and enabling the play button.

---

### Data Flow: Chapter Audio Download

This section details the flow for downloading a generated audio chapter.

1.  **User Interaction (Client-Side):**
    *   In the `ChapterList.tsx` component, the user clicks the "Download" button, which is only enabled for chapters with a `status` of `complete`.

2.  **Event Handling (Client-Side):**
    *   The `onClick` event on the button calls the `onDownloadChapter` prop function, passing the specific `chapter.id`.
    *   This function is implemented as `handleDownloadChapter` in `HomePage.tsx`.

3.  **Download Execution (Client-Side):**
    *   The `handleDownloadChapter` function finds the corresponding chapter in the local state to get its `audio_url`.
    *   It dynamically creates an invisible `<a>` (anchor) element in the DOM.
    *   It sets the `href` of the anchor to the chapter's `audio_url`.
    *   It sets the `download` attribute to a formatted filename, like `MyBook_chapter_1.mp3`, to provide a sensible default name for the user.
    *   It programmatically clicks the anchor element, which triggers the browser's standard file download dialog.
    *   Finally, it removes the temporary anchor element from the DOM.

---

## V. Technology-Specific Guidelines

- **React + TypeScript:** Functional components with hooks, strict typing.
- **Redux Toolkit:** For global state if needed; keep store simple.
- **Shadcn/UI & Tailwind CSS:** Use for consistent, accessible UI.
- **React Query:** For data fetching, caching, and error/loading states.
- **Supabase:**
    - Use JS client for DB, storage, and (future) auth.
    - Row Level Security (RLS) for data access.
    - Error handling and logging.
    - Secure API keys with env vars.
- **ElevenLabs API:**
    - Server-side calls only.
    - Handle errors and rate limiting.
- **Supabase Edge Functions:**
    - TypeScript, Node.js style guide.
    - Error handling, logging, secure secrets.

---

## VI. Cross-Cutting Concerns

- **Error Handling:** Consistent strategy, meaningful messages, logging.
- **Logging:** Use Supabase logging for important events/errors.
- **Security:** Input sanitization, HTTPS, env vars for secrets, rate limiting, authentication/authorization (future).
- **Testing:** Unit and integration tests using **Vitest** and **React Testing Library**.
- **Performance:** Code splitting, asset compression, optimize queries.

---

## VII. Deployment

- **Front-End:** Deploy to Vercel/Netlify.
- **Back-End:** Deploy Supabase Edge Functions to Supabase.
- **Environment Variables:** Configure securely in deployment environment.
- **CI/CD:** Automate build, test, and deployment (GitHub Actions, etc.).

---

## VIII. Extensibility & Scalability

(Placeholder for future details)

---

---

## IX. Supabase Backend Structure (`supabase` directory)

This section details the structure and purpose of key files and directories related to the Supabase backend configuration and development.

-   **`supabase/`**: Root directory for Supabase-specific configurations and code.
    -   **`migrations/`**: Contains SQL migration files that define the database schema. Each file represents a step in the database evolution and is typically timestamped or numbered sequentially.
        -   `0001_create_ebooks_table.sql`: SQL script to create the `ebooks` table.
        -   `0002_create_chapters_table.sql`: SQL script to create the `chapters` table.
    -   **`functions/`**: Houses the source code for Supabase Edge Functions.
        -   **`_shared/`**: Contains shared code, like `cors.ts` for CORS headers, used across multiple functions.
        -   **`upload-ebook/`**: Edge Function to handle file uploads, parsing, and database record creation.
        -   **`generate-audio-batch/`**: Edge Function to handle TTS generation and storage uploads.
        -   **`get-audiobook-details/`**: Edge Function to retrieve all details for a given ebook.

## X. Frontend Project Structure (`frontend` directory)

This section details the structure and purpose of key files and directories within the `frontend` project, initialized with Vite, React, and TypeScript.

-   **`frontend/`**: Root directory for the frontend application.
    -   **`node_modules/`**: Contains all installed npm packages (project dependencies). Managed by npm, not version controlled.
    -   **`public/`**: Static assets that are copied directly to the build output directory. Can be used for favicons, `robots.txt`, etc. (Note: Vite typically uses `index.html` at the project root for the main entry point, and assets in `public` are served at the root path).
    -   **`src/`**: Contains the main source code for the React application.
        -   **`assets/`**: For static assets like images, fonts, etc. (Contains `.gitkeep` initially).
        -   **`components/`**: Reusable UI components. This project uses **Shadcn/UI**, which provides accessible and composable components built on top of Radix UI and Tailwind CSS. Components are added via a CLI tool, which places the source code directly into this directory, allowing for full customization.
            -   `ChapterList.tsx`: Renders the list of chapters. Uses Shadcn `Card`, `Badge`, and `Button` components, along with `lucide-react` icons, to display chapter status and actions.
            -   `FileUpload.tsx`: Provides the UI for uploading a file.
            -   `FileUpload.test.tsx`: Contains unit tests for the `FileUpload` component using Vitest and React Testing Library. It verifies that the component renders correctly, handles user interactions (button clicks, file selection, and cancellation), and calls the `onFileSelect` callback appropriately. These tests ensure the component is reliable and robust.
            -   `TextInputArea.tsx`: A reusable component for the main text input.
            -   `VoiceSelection.tsx`: A component for selecting the TTS voice.
        -   **`hooks/`**: Custom React hooks for reusable stateful logic. (Contains `.gitkeep` initially).
        -   **`pages/`**: Top-level components that correspond to application routes/views.
            -   `HomePage.tsx`: The main page of the application, orchestrating all major UI components and state. It uses Shadcn `Card` for layout, `Progress` for feedback, and `sonner` for toast notifications. It manages the core application state, handles file/text input, initiates the audio generation process via API calls, and manages the Supabase Realtime subscription for live updates.
        -   **`services/`**: Modules for interacting with external APIs or backend services (e.g., Supabase functions, other third-party APIs). (Contains `.gitkeep` initially).
        -   **`store/`**: (If using Redux or similar) State management logic, including reducers, actions, and selectors. (Contains `.gitkeep` initially).
        -   **`utils/`**: Utility functions and helpers. (Contains `.gitkeep` initially).
        -   **`App.css`**: CSS styles specific to the `App` component (can be removed or repurposed if global styles in `index.css` and Tailwind are preferred).
        -   **`App.tsx`**: The root React component. It now primarily defines the application's routing structure using `<Routes>` and `<Route>` from `react-router-dom` to map URL paths to page components (e.g., rendering `HomePage` for the `/` path).
        -   `*.test.tsx`: Test files are co-located with their respective components. The project uses **Vitest** for running tests and **React Testing Library** for rendering and interacting with components in a simulated DOM environment. Mocks for services (`api.ts`) and clients (`supabaseClient.ts`) are used to isolate components during unit testing.
        -   **`index.css`**: Global CSS styles, including Tailwind CSS base styles, components, and utilities.
        -   `main.tsx`: The entry point for the React application. It renders the root `App` component into the `div#root` element in `index.html`. It's also responsible for setting up global providers, such as `BrowserRouter` from `react-router-dom` to enable client-side routing.
        -   **`vite-env.d.ts`**: TypeScript declaration file for Vite-specific environment variables and client types.
        -   **`supabaseClient.ts`**: Initializes and exports the Supabase client instance. Used for all interactions with the Supabase backend.
        -   **`supabaseClient.test.ts`**: Contains tests for the Supabase client, ensuring it initializes correctly and can connect to the database.
    -   **`.env.local`**: (Not version controlled) Stores local environment variables, including Supabase URL and anon key for the frontend.
    -   **`.env.example`**: A template file showing the structure of `.env.local`, for other developers to use.
    -   **`.eslintrc.cjs`**: Configuration file for ESLint, used for code linting and enforcing code style.
    -   **`index.html`**: The main HTML page that serves as the entry point for the single-page application (SPA). Vite injects the bundled JavaScript and CSS into this file during development and build.
    -   **`package-lock.json`**: Records the exact versions of all installed dependencies and their sub-dependencies. Ensures consistent installations across different environments. Version controlled.
    -   **`package.json`**: Defines project metadata, scripts (like `dev`, `build`, `lint`), and lists project dependencies (both runtime and development).
    -   **`README.md` (if generated by Vite)**: Basic information about the Vite project.
    -   **`.prettierrc.json`**: Configuration file for Prettier, used for code formatting.
    -   **`postcss.config.js`**: Configuration file for PostCSS, used by Tailwind CSS for processing CSS.
    -   **`tailwind.config.js`**: Configuration file for Tailwind CSS, used to customize utility classes, themes, and plugins.
    -   **`tsconfig.json`**: TypeScript compiler configuration for the project. Defines how TypeScript files are compiled to JavaScript.
    -   **`tsconfig.node.json`**: Separate TypeScript configuration specifically for Node.js-related files in the project, such as `vite.config.ts`. This allows for different compiler options (e.g., module system) for build tooling versus application code.
    -   **`vite.config.ts`**: Configuration file for Vite, the build tool and development server. Used to customize Vite's behavior, add plugins (like the React plugin), and set up proxy rules, etc.
    -   **`.husky/`**: Directory containing Git hooks managed by Husky.
        -   **`pre-commit`**: Script executed before each commit, configured to run `lint-staged` for code quality checks.

This structure provides a standard and maintainable organization for a modern React and TypeScript application built with Vite, integrated with Supabase for backend services.

- Modular, feature-based code structure.
- API versioning for Edge Functions.
- Environment config for all secrets/endpoints.
- Ready for user auth, persistent libraries, advanced voice settings, and analytics in future iterations. 
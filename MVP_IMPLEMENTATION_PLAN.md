# AI Audiobook Web App - MVP Implementation Plan

**Objective:** Implement the first vertical slice: TXT file upload or text paste, voice selection, audio generation via ElevenLabs, and in-app audio playback.

**Target Audience:** AI Developers

**Guiding Documents:**
- `VERTICAL_SLICE_PRD_1_TXT_TO_AUDIO.md`
- `TECH_STACK.md`
- `ARCHITECTURE.md`

**General Instructions for AI Developer:** 
- Follow the `VIBE_CODING.md` best practices.
- Implement in a `frontend` subdirectory using Vite, React, and TypeScript.
- Use Material UI and Tailwind CSS for styling.
- Commit changes to Git after each successfully tested step or logical group of steps.
- Ensure all environment variables (like API keys) are handled securely and are configurable, not hardcoded.

---

## Phase 1: Project Scaffolding & Basic Setup (Frontend)

**Step 1.1: Scaffold React + TypeScript Project with Vite**
- **Instruction:** Create a new Vite project named `frontend` in the root directory `/Users/anastasiakim/HarmonicAIv3/` using the React + TypeScript template.
- **Test:** 
    - Verify the `frontend` directory is created.
    - Navigate into `frontend` and run the development server (`npm run dev` or `yarn dev`).
    - Ensure the default Vite React app loads successfully in a browser.

**Step 1.2: Install Core Dependencies**
- **Instruction:** Inside the `frontend` directory, install the following core dependencies:
    - Material UI (`@mui/material @emotion/react @emotion/styled @mui/icons-material`)
    - Tailwind CSS (`tailwindcss postcss autoprefixer`)
    - React Router (`react-router-dom`)
    - Redux Toolkit (`@reduxjs/toolkit react-redux`)
    - React Query (`@tanstack/react-query`)
    - Axios (or `fetch` API, for HTTP requests): `axios`
- **Test:** 
    - Check `package.json` to confirm all dependencies are listed with current stable versions.
    - Ensure the development server still runs without errors after installations.

**Step 1.3: Configure Tailwind CSS**
- **Instruction:** 
    1. Initialize Tailwind CSS by creating `tailwind.config.js` and `postcss.config.js` (`npx tailwindcss init -p`).
    2. Configure the `content` paths in `tailwind.config.js` to include all relevant source files (e.g., `./src/**/*.{js,jsx,ts,tsx}`).
    3. Add Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`) to the main CSS file (e.g., `src/index.css`).
- **Test:**
    - Apply a basic Tailwind utility class (e.g., `bg-blue-500`, `text-xl`) to an element in `App.tsx`.
    - Verify the style is applied correctly when viewing the app in the browser.

**Step 1.4: Basic Material UI Setup**
- **Instruction:** Wrap the root component in `App.tsx` with Material UI's `ThemeProvider` and a basic theme (can be default for now).
- **Test:**
    - Import and render a simple Material UI component (e.g., `<Button>Test Button</Button>`) in `App.tsx`.
    - Verify the button renders with Material UI styling.

**Step 1.5: Setup Basic App Structure & Routing**
- **Instruction:**
    1. Create a `components` directory in `src`.
    2. Create a `pages` directory in `src`.
    3. Create a basic `HomePage.tsx` in `src/pages`.
    4. Configure React Router in `App.tsx` or a dedicated `Router.tsx` to render `HomePage` for the root path (`/`).
- **Test:**
    - Verify that `HomePage.tsx` content is displayed when navigating to the root URL.

---

## Phase 2: Text Input UI (Frontend)

**Step 2.1: Create Text Input Area Component**
- **Instruction:** In `src/components`, create a `TextInputArea.tsx` component.
    - It should include a Material UI `TextField` with `multiline` prop for pasting text.
    - It should have a placeholder like "Paste your text here...".
    - The component should manage its own state for the pasted text.
- **Test:**
    - Render `TextInputArea` on `HomePage.tsx`.
    - Verify users can type and paste multiple lines of text into the field.
    - Verify the text is retained in the component's state.

**Step 2.2: Create File Upload Component (.txt only)**
- **Instruction:** In `src/components`, create a `FileUpload.tsx` component.
    - It should include an HTML `<input type="file" accept=".txt" />` styled with Material UI (e.g., using a Button to trigger the hidden input).
    - It should handle file selection and read the content of the selected `.txt` file.
    - The component should manage the state of the file content.
- **Test:**
    - Render `FileUpload` on `HomePage.tsx`.
    - Verify users can click a button to open the file dialog.
    - Verify only `.txt` files are selectable (browser dependent, but `accept` attribute helps).
    - Verify that after selecting a `.txt` file, its content is read and stored in the component's state.
    - Test with a non-.txt file to ensure it's not processed (or ideally, not selectable).

**Step 2.3: Display Uploaded/Pasted Text for Preview**
- **Instruction:** On `HomePage.tsx`, add a read-only area (e.g., a `div` or a disabled `TextField`) to display the text content obtained from either `TextInputArea` or `FileUpload`.
    - Implement logic to show text from whichever input method was last used or has content.
- **Test:**
    - Paste text: Verify it appears in the preview area.
    - Upload a `.txt` file: Verify its content appears in the preview area, replacing any pasted text if applicable.
    - Ensure the preview area is not editable by the user.

---

## Phase 3: Voice Selection UI (Frontend)

**Step 3.1: Create Voice Selection Component**
- **Instruction:** In `src/components`, create a `VoiceSelection.tsx` component.
    - It should display a list of 3-5 predefined AI voices (hardcode these for now, e.g., { id: 'voice_id_1', name: 'Narrator A' }, { id: 'voice_id_2', name: 'Storyteller B' }).
    - Use Material UI `Select` component or `RadioGroup` for selection.
    - The component should manage the state of the selected voice ID.
    - A default voice should be pre-selected.
- **Test:**
    - Render `VoiceSelection` on `HomePage.tsx`.
    - Verify the list of voices is displayed.
    - Verify a default voice is selected.
    - Verify the user can select a different voice and the component's state updates.

---

## Phase 4: Backend Endpoint for Text Processing (Supabase Edge Function)

**Step 4.1: Create Supabase Edge Function `process-text`**
- **Instruction:** 
    1. Set up the Supabase CLI and link it to your Supabase project.
    2. Create a new Edge Function named `process-text` (TypeScript).
    3. This function should accept a POST request with a JSON body containing `inputText` (string) and `voiceId` (string).
    4. **For this step, only implement input validation:** Ensure `inputText` is not empty and `voiceId` is provided. Return a basic success response if valid (e.g., `{ message: "Input received", receivedText: inputText, voice: voiceId }`) or an error response (e.g., 400) if invalid.
- **Test:**
    - Deploy the function to Supabase.
    - Use a tool like Postman or `curl` to send a valid POST request to the deployed function's URL. Verify a 200 OK success response with the echoed data.
    - Send an invalid request (e.g., empty `inputText`). Verify a 400 Bad Request error response.

**Step 4.2: Integrate ElevenLabs API Call (No Audio Storage Yet)**
- **Instruction:** Modify the `process-text` Edge Function:
    1. Securely retrieve the ElevenLabs API key from environment variables.
    2. Using the `inputText` and `voiceId`, make an API call to the ElevenLabs TTS endpoint.
    3. **For this step, do not store the audio.** Simply check if the API call is successful (e.g., receives a 200 OK from ElevenLabs and some audio data or stream).
    4. If the ElevenLabs call is successful, return a success message (e.g., `{ message: "ElevenLabs API call successful" }`).
    5. If the ElevenLabs call fails, log the error and return an appropriate error response (e.g., 500 or specific error from ElevenLabs).
- **Test:**
    - Configure your ElevenLabs API key as an environment variable for the Edge Function.
    - Send a valid request with short sample text. Verify a success response indicating the API call was made.
    - Test with an invalid API key (temporarily) or a known failing condition to verify error handling from ElevenLabs is caught and reported by the Edge Function.

**Step 4.3: Store Generated Audio in Supabase Storage**
- **Instruction:** Modify the `process-text` Edge Function:
    1. Set up a Supabase Storage bucket (e.g., `audiobook-outputs`) with appropriate access policies (e.g., public read or private with signed URLs – for MVP, public read might be simpler initially).
    2. After a successful ElevenLabs API call, take the received audio stream/data.
    3. Upload this audio data as an MP3 file to the `audiobook-outputs` bucket. Generate a unique filename (e.g., using a UUID).
    4. If storage is successful, return a JSON response containing the public URL of the stored audio file (e.g., `{ audioUrl: '...' }`).
    5. Handle potential errors during storage and return appropriate error responses.
- **Test:**
    - Send a valid request. Verify the Edge Function returns a success response with a `audioUrl`.
    - Check the Supabase Storage bucket to confirm the MP3 file was created and is accessible via the returned URL.
    - Test error conditions (e.g., bucket misconfiguration, storage service error if mockable) and verify error responses.

---

## Phase 5: Frontend-Backend Integration & Audio Playback

**Step 5.1: Implement API Call from Frontend**
- **Instruction:** On `HomePage.tsx` (or a dedicated service/hook):
    1. Create a function that will be triggered by a "Generate Audio" button.
    2. This function should take the current `inputText` (from preview area) and selected `voiceId` (from `VoiceSelection` component).
    3. Make a POST request (using Axios or `fetch`) to your deployed `process-text` Supabase Edge Function, sending the text and voice ID.
    4. Use React Query for managing the API call's loading, success, and error states.
- **Test:**
    - Add a "Generate Audio" button to `HomePage.tsx`.
    - Click the button with valid text and a selected voice.
    - Use browser developer tools (Network tab) to verify the POST request is sent to the Edge Function with the correct payload.
    - `console.log` the response from the Edge Function to verify the `audioUrl` is received on success, or an error message on failure.

**Step 5.2: Display Loading State**
- **Instruction:** Using React Query's state (`isLoading`), display a visual loading indicator (e.g., Material UI `CircularProgress`) on `HomePage.tsx` while the audio generation API call is in progress.
- **Test:**
    - Click "Generate Audio". Verify the loading indicator appears.
    - Verify the loading indicator disappears when the API call completes (either success or error).

**Step 5.3: Display Error Messages**
- **Instruction:** Using React Query's state (`isError`, `error`), display a user-friendly error message (e.g., Material UI `Alert` component) on `HomePage.tsx` if the API call to `process-text` fails.
- **Test:**
    - Trigger a failure in the Edge Function (e.g., by providing invalid input that the frontend might miss, or a temporary misconfiguration in the backend).
    - Verify a clear error message is shown to the user on the frontend.

**Step 5.4: Implement Audio Playback**
- **Instruction:** 
    1. If the API call is successful and an `audioUrl` is received, store this URL in the state of `HomePage.tsx`.
    2. Render an HTML5 `<audio controls src={audioUrl}></audio>` element on the page, only when `audioUrl` is available.
    3. Style the audio player if necessary using Material UI or Tailwind.
- **Test:**
    - Successfully generate an audio file.
    - Verify the audio player appears on the page.
    - Verify the user can play, pause, seek, and adjust the volume of the generated audio using the player controls.
    - Test with a new text input to ensure the player updates with the new audio.

---

**MVP Completion Criteria (for this slice):**
- User can upload a `.txt` file or paste text.
- User can see a preview of the input text.
- User can select from a list of predefined voices.
- User can click a "Generate Audio" button.
- A loading indicator is shown during processing.
- The generated audio can be played back within the application using a standard audio player.
- Basic error messages are shown for failures in the process.
- Code is committed to Git with a clean history of implemented steps.

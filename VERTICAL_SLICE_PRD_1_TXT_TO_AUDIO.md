# Vertical Slice PRD 1: TXT Upload to Audio Playback

**Parent Document:** `PRD.md`, `DEVELOPMENT_PLAN.md` (Phase 2)

## 1. Introduction & Goal

This document outlines the product requirements for the first major vertical slice of the AI Audiobook Web App MVP. The primary goal of this slice is to establish the core end-to-end workflow: allowing a user to input plain text (either by uploading a .txt file or pasting directly), select an AI voice, trigger audio generation, and play back the generated audio within the application.

## 2. Scope

### 2.1. In Scope

- **Frontend:**
    - UI for .txt file upload.
    - UI for pasting text into a textarea.
    - Display of uploaded/pasted plain text for preview (uneditable).
    - UI for selecting one of 3-5 pre-defined ElevenLabs AI voices.
    - Button to initiate audio generation.
    - Basic audio player (HTML5 `<audio>` element) to play a single audio stream.
    - Display of loading/processing states during audio generation.
    - Basic error message display for failed operations.
- **Backend (Supabase Edge Functions):**
    - `upload-ebook` Edge Function to receive .txt file or pasted text, validate input, and create `ebooks` and `chapters` records in Supabase PostgreSQL with the input text.
    - `generate-audio` Edge Function to take a chapter ID and voice ID, integrate with ElevenLabs API to convert the chapter's text to audio, store the generated MP3 in Supabase Storage, and return its URL.
- **Infrastructure:**
    - Basic Supabase setup (relevant tables for text/audio metadata if needed, storage bucket for audio).

### 2.2. Out of Scope for This Slice

- EPUB or PDF file support.
- Advanced chapter detection or processing.
- User accounts or authentication.
- Persistent user libraries.
- Audio download functionality.
- Advanced UI/UX polish beyond basic functionality.
- Comprehensive error handling for all edge cases.
- Splitting text into multiple audio segments (entire input text is one audio output).

## 3. User Stories

- **US1.1:** As a user, I want to upload a .txt file containing an article, so that I can convert it to audio.
- **US1.2:** As a user, I want to paste text from my clipboard into the application, so that I can convert it to audio.
- **US1.3:** As a user, I want to see the text I've uploaded or pasted, so I can confirm it's correct before generating audio.
- **US1.4:** As a user, I want to choose from a small selection of AI voices, so I can pick one that I prefer.
- **US1.5:** As a user, I want to click a button to start the audio generation process for my text.
- **US1.6:** As a user, I want to see an indicator that the audio is being processed, so I know the system is working.
- **US1.7:** As a user, I want to play the generated audio directly within the web application, so I can listen to my content.
- **US1.8:** As a user, I want to see a clear error message if the audio generation fails, so I understand what went wrong.

## 4. Functional Requirements

### 4.1. Frontend

- **FR1.1 (Text Input - File):** The system shall provide a file input control that accepts only `.txt` files.
- **FR1.2 (Text Input - Paste):** The system shall provide a textarea input for users to paste text.
- **FR1.3 (Text Preview):** The system shall display the content of the uploaded `.txt` file or pasted text in a read-only preview area.
- **FR1.4 (Voice Selection):** The system shall display a list of 3-5 selectable AI voices (names/identifiers).
    - Default voice should be pre-selected.
- **FR1.5 (Audio Generation Trigger):** The system shall provide a button (e.g., "Generate Audio") that, when clicked, initiates the audio generation process using the provided text and selected voice.
- **FR1.6 (Loading State):** The system shall display a visual loading indicator while the audio is being generated.
- **FR1.7 (Audio Playback):** The system shall embed an HTML5 audio player capable of playing the generated MP3 audio returned from the backend.
    - Player should have basic controls (play/pause, volume, seek bar).
- **FR1.8 (Error Display):** The system shall display a user-friendly error message if the audio generation or playback fails.

### 4.2. Backend (Supabase Edge Functions)

- **FR1.9 (Text Reception & Initial Processing):** The `upload-ebook` Edge Function shall accept input text (from file upload or paste).
    - It shall validate that the text is not empty.
    - For file uploads, it shall validate the file type is `.txt`.
    - It shall create an `ebooks` record and a single `chapters` record containing the full input text, marking it as "pending_tts".
    - It shall return the `ebook_id` and `chapter_id`.
- **FR1.10 (TTS Conversion):** The `generate-audio` Edge Function shall accept a `chapter_id` and `voice_id`.
    - It shall retrieve the chapter's text.
    - It shall make an API call to ElevenLabs using the chapter text and selected `voice_id`.
    - It must securely handle the ElevenLabs API key.
- **FR1.11 (Audio Storage):** The `generate-audio` Edge Function shall receive the audio stream/file from ElevenLabs and store it as an MP3 file in a designated Supabase Storage bucket (e.g., `audiobook-outputs/ebook_id/chapter_1.mp3`).
    - It shall update the `chapters` record with the `audio_url` and status "complete".
- **FR1.12 (Audio URL Return):** The `generate-audio` Edge Function shall return the `audio_url` of the stored MP3 file to the frontend.
- **FR1.13 (Error Handling):** The Edge Function shall return appropriate error responses (e.g., HTTP status codes, error messages) if any step in the process fails (e.g., ElevenLabs API error, storage error).

## 5. Non-Functional Requirements (for this slice)

- **NFR1.1 (Performance):** Audio generation for a short text (e.g., 500 words) should ideally complete within 15-30 seconds (dependent on ElevenLabs API).
- **NFR1.2 (Usability):** The UI for text input, voice selection, and playback should be intuitive and require minimal instruction.

## 6. Acceptance Criteria

- **AC1.1:** User can successfully upload a `.txt` file, see its content, select a voice, click "Generate Audio", and play the resulting audio.
- **AC1.2:** User can successfully paste text, see the pasted content, select a voice, click "Generate Audio", and play the resulting audio.
- **AC1.3:** A loading indicator is shown during audio processing and disappears upon completion or failure.
- **AC1.4:** If audio generation fails (e.g., ElevenLabs API key invalid, API down), a clear error message is displayed to the user.
- **AC1.5:** The selected voice is used for the generated audio output.
- **AC1.6:** Generated audio is stored in the Supabase Storage bucket.
- **AC1.7:** Basic audio player controls (play, pause, volume, seek) are functional.

## 7. Assumptions & Dependencies

- Supabase project is set up with necessary configurations.
- ElevenLabs API account is available and API key is configured in the backend environment.
- Basic frontend layout and navigation structure are in place (as per Phase 1 of `DEVELOPMENT_PLAN.md`).

This PRD focuses on the foundational text-to-audio pipeline. Subsequent slices will build upon this core functionality.

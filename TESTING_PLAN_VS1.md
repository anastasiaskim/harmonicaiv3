# Vertical Slice 1: TXT to Audio - Testing Plan

This document outlines the test cases for validating the end-to-end functionality of Vertical Slice 1 (VS1), which covers uploading or pasting TXT content, generating audio with a selected voice, and playing it back.

## 1. Test Environment & Prerequisites

-   Local Supabase environment is running (`supabase start`).
-   Local frontend development server is running (`npm run dev`).
-   All required environment variables are correctly set for both the frontend (`.env.local`) and Supabase functions (`supabase/functions/.env`).
-   The browser's developer console is open to monitor network requests and logs.
-   Supabase Studio (local) is open to inspect database tables and storage buckets.

---

## 2. Test Cases

### Test Case 2.1: Happy Path - Pasted Text

-   **Objective**: Verify the full end-to-end flow using pasted text.
-   **Steps**:
    1.  Navigate to the `HomePage` of the application.
    2.  Copy a short paragraph of text (e.g., 2-3 sentences).
    3.  Paste the text into the `TextInputArea`.
    4.  Select a voice from the `VoiceSelection` dropdown (e.g., "Adam").
    5.  Click the "Generate Audiobook" button.
    6.  Wait for the process to complete.
-   **Expected Results**:
    -   **UI**: A loading indicator appears and then disappears. An HTML5 `<audio>` player is displayed on the page. No errors are shown in the UI or console (other than the successful URL rewrite).
    -   **Playback**: Clicking the play button on the audio player successfully plays the generated audio corresponding to the pasted text and selected voice.
    -   **Database (`ebooks` table)**: A new row is created. `file_name` should be similar to `pasted-text-TIMESTAMP.txt`. `status` should be `complete`.
    -   **Database (`chapters` table)**: A new row is created, linked to the new `ebook_id`. `text_content` matches the pasted text. `status` is `audio_generated`. `audio_url` is populated and accessible (e.g., `http://localhost:54321/...`).
    -   **Storage (`audiobook-outputs` bucket)**: A new MP3 file is present at the path specified in the `audio_url`.
    -   **Storage (`ebook-uploads` bucket)**: No new file should be created for pasted text.

### Test Case 2.2: Happy Path - .txt File Upload

-   **Objective**: Verify the full end-to-end flow using a `.txt` file upload.
-   **Steps**:
    1.  Create a local `.txt` file with a few sentences of text.
    2.  Navigate to the `HomePage`.
    3.  Click the `FileUpload` component and select the created `.txt` file.
    4.  Verify the text from the file appears in the preview area.
    5.  Select a different voice from the dropdown (e.g., "Bella").
    6.  Click the "Generate Audiobook" button.
    7.  Wait for the process to complete.
-   **Expected Results**:
    -   **UI**: Same as Test Case 2.1.
    -   **Playback**: Same as Test Case 2.1.
    -   **Database (`ebooks` table)**: A new row is created. `file_name` matches the name of the uploaded file. `status` is `complete`.
    -   **Database (`chapters` table)**: A new row is created with the correct `ebook_id`. `text_content` matches the file content. `status` is `audio_generated`. `audio_url` is populated and accessible.
    -   **Storage (`audiobook-outputs` bucket)**: A new MP3 file is present.
    -   **Storage (`ebook-uploads` bucket)**: A new file is present at the path `ebooks/{new_ebook_id}/original.txt`.

### Test Case 2.3: Error Handling - Empty Input

-   **Objective**: Verify that the system handles empty text input gracefully.
-   **Steps**:
    1.  Navigate to the `HomePage`.
    2.  Ensure the text input area is empty.
    3.  Click the "Generate Audiobook" button.
-   **Expected Results**:
    -   **UI**: An error message should be displayed to the user indicating that the text input cannot be empty. No API calls should be made.

### Test Case 2.4: Error Handling - Invalid File Type

-   **Objective**: Verify that the system rejects non-`.txt` files.
-   **Steps**:
    1.  Create a file with an invalid extension (e.g., `test.jpg` or `test.pdf`).
    2.  Navigate to the `HomePage`.
    3.  Attempt to upload the invalid file using the `FileUpload` component.
-   **Expected Results**:
    -   **UI**: The file selection should either fail silently or display an error message to the user. The text preview area should not be populated, and the "Generate Audiobook" button should ideally remain disabled or show an error if clicked. The backend `upload-ebook` function should return a `400` or `415` error if the request is somehow sent.

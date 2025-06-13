Product Requirements Document (PRD): Minimal Audiobook Web App MVP

1. Product Overview
------------------
Goal:
Deliver a web-based MVP that allows users to upload text-based files, convert them to audio using ElevenLabs TTS, and play or download the resulting audiobook chapters. The app will feature a simple, modern UI and basic analytics.

Target Users:
General readers, students, and anyone wishing to convert ebooks or text to audio for personal use.

2. Scope
--------
In Scope:
- Text upload (TXT, EPUB, PDF) or direct text input
- ElevenLabs TTS integration
- Audio playback and download (chapter by chapter)
- Simple, responsive UI
- Basic analytics (e.g., number of conversions, file types used)

Out of Scope (for MVP):
- User authentication/accounts
- Persistent user libraries
- Advanced voice settings
- Text editing
- Multi-language support
- Mobile app
- Subscription/payments

3. Product Features & User Stories
----------------------------------
3.1. Text Upload
User Story:
As a user, I can upload a text-based ebook file (txt, epub, pdf) or paste text directly to the app.

Acceptance Criteria:
- Users can upload `.txt`, `.epub`, or `.pdf` files, or paste text.
- The app extracts and displays the text for review.
- Invalid/unreadable files trigger a clear error message.
- File size and character limits are enforced and communicated (e.g., 50,000 characters or 5MB).

3.2. Voice Selection (AI Persona)
User Story:
As a user, I can select a voice (AI persona) for the audiobook narration.

Acceptance Criteria:
- At least 3-5 pre-selected ElevenLabs voices are available.
- Each voice is shown with a name and brief description.
- The selected voice is used for all audio generation in the session.

3.3. Audiobook Generation (Chapter by Chapter)
User Story:
As a user, I can generate the complete audiobook and listen to it chapter by chapter.

Acceptance Criteria:
- The app detects chapters or splits text into logical sections.
- Users can initiate full audiobook generation.
- Each chapter/section is converted to audio and listed for playback.
- Progress/loading indicators are shown during conversion.

3.4. Download Audiobook Chapters
User Story:
As a user, I can download the generated audiobook chapters.

Acceptance Criteria:
- Each chapter/section has a download button.
- Audio files are downloadable in MP3 format.
- Files are named clearly (e.g., `Chapter_1.mp3`).

3.5. Basic Analytics
Acceptance Criteria:
- Track and display (admin-only or for future use): number of conversions, file types uploaded, most popular voices.

4. Functional Requirements
--------------------------
FR1: Text Input & Upload
- FR1.1: Support for `.txt`, `.epub`, `.pdf` file uploads.
- FR1.2: Support for direct text input (textarea).
- FR1.3: Extract and display text for user review.
- FR1.4: Enforce file size/character limits (e.g., 50,000 chars or 5MB).
- FR1.5: Provide feedback on upload success/failure.

FR2: Voice Selection
- FR2.1: Present a dropdown or radio selection of 3-5 ElevenLabs voices.
- FR2.2: Show name/description for each voice.

FR3: TTS Conversion
- FR3.1: On "Generate Audiobook", send text and selected voice to ElevenLabs API.
- FR3.2: Handle async API calls with progress indicators.
- FR3.3: Retrieve and store audio files (MP3) using Supabase Storage.
- FR3.4: Handle and display errors (API, file, etc.).
- FR3.5: Limit API calls per user/session to prevent abuse.

FR4: Audio Playback & Download
- FR4.1: List generated chapters/sections with audio players.
- FR4.2: Provide download buttons for each chapter (MP3).
- FR4.3: Name files clearly (e.g., `Chapter_1.mp3`).

FR5: UI/UX
- FR5.1: Clean, modern, and responsive design (desktop/mobile).
- FR5.2: Use Material UI and Tailwind CSS for consistency.
- FR5.3: Clear instructions, feedback, and error messages.
- FR5.4: Minimal navigation (single-page app).

5. Non-Functional Requirements
-----------------------------
- Performance:
  - Page load < 3 seconds.
  - TTS conversion initiation is responsive; show progress for longer conversions.
- Usability:
  - Intuitive for users with basic web literacy.
  - No training required.
- Reliability:
  - Graceful error handling for file, API, and network issues.
- Security:
  - Protect user data in transit.
  - Prevent API abuse (rate limiting, input validation).
- Browser Compatibility:
  - Chrome, Firefox, Safari, Edge (latest versions).

6. User Interface Requirements
-----------------------------
- File Upload Area: Drag-and-drop or button for file upload.
- Text Input Area: For direct text entry.
- Voice Selection: Dropdown or radio group with voice names/descriptions.
- Audio Player: For each generated chapter.
- Download Button: For each chapter.
- Progress Indicator: For TTS conversion.
- Error Messages: For upload, conversion, and playback errors.

7. Analytics (Basic, Optional for MVP)
--------------------------------------
- Track number of conversions, file types, and voice selections (for admin/future use).

8. Release Criteria
-------------------
- All functional and non-functional requirements are met.
- UI/UX is clean, responsive, and bug-free.
- Works on all major browsers and devices.
- No critical bugs in the core workflow.
- Documentation for deployment and maintenance is provided.

9. Open Issues & Decisions
--------------------------
- Finalize 3-5 ElevenLabs voices for MVP.
- Set exact file size/character limits.
- Define detailed error handling for API failures.
- Decide on analytics granularity for MVP.

10. Appendix
------------
Glossary:
- TTS: Text-to-Speech
- MVP: Minimum Viable Product
- API: Application Programming Interface
- UI: User Interface 
# Vertical Slice PRD 3: Download Functionality & UI Polish

**Parent Document:** `PRD.md`, `DEVELOPMENT_PLAN.md` (Phase 4)
**Depends On:** Successful completion of Vertical Slice 1 & 2

## 1. Introduction & Goal

This document outlines product requirements for the third major vertical slice. The primary goals are to enable users to download generated audio chapters as MP3 files and to significantly polish the overall User Interface (UI) and User Experience (UX) of the application. This slice focuses on completing core MVP features and enhancing usability and presentation.

## 2. Scope

### 2.1. In Scope

- **Frontend:**
    - UI element (e.g., download button/icon) associated with each chapter in the chapter list.
    - UI element for downloading all chapters as a ZIP file (optional, stretch goal for MVP).
    - Implementation of audio file download when the download button is clicked.
    - Comprehensive UI/UX review and polish:
        - Consistent styling and branding (using Material UI theming and Tailwind CSS utility classes).
        - Improved layout, spacing, and typography.
        - Enhanced user feedback mechanisms (e.g., clearer loading states, success/error notifications/toasts).
        - Improved responsiveness across common device sizes (desktop, tablet, mobile).
        - Accessibility improvements (e.g., ARIA attributes, keyboard navigation).
- **Backend (Supabase Edge Functions):**
    - Ensure audio files in Supabase Storage are accessible for download (e.g., via public URLs or by generating temporary signed URLs if buckets are private).
    - (Optional, for 'Download All') Edge Function to retrieve all chapter audio files for an ebook, package them into a ZIP file, and make it available for download.
- **General:**
    - Basic client-side analytics/logging for key events (e.g., file upload, audio generation start/success/fail, chapter download). This is for MVP-level understanding, not a full analytics suite.

### 2.2. Out of Scope for This Slice

- Advanced download options (e.g., selecting specific chapters to include in a ZIP, choosing audio format/quality beyond default MP3).
- User accounts or download history.
- Offline playback capabilities within the app (beyond downloaded files).
- Server-side rendering (SSR) or advanced SEO optimizations.

## 3. User Stories

- **US3.1:** As a user, I want to download an individual audio chapter as an MP3 file, so I can listen to it offline on my preferred device.
- **US3.2 (Optional):** As a user, I want to download all chapters of my audiobook as a single ZIP file, for convenience.
- **US3.3:** As a user, I want the application to look professional and be easy to navigate, so I have a pleasant experience.
- **US3.4:** As a user, I want clear visual feedback when I perform actions (e.g., uploading, generating, downloading), so I know what the system is doing.
- **US3.5:** As a user, I want the application to work well and look good on my mobile phone or tablet, not just my desktop computer.

## 4. Functional Requirements

### 4.1. Frontend

- **FR3.1 (Download Button - Single Chapter):** For each chapter listed, a clearly identifiable download button/icon shall be present.
- **FR3.2 (Single Chapter Download Action):** Clicking the download button for a chapter shall initiate the download of its corresponding MP3 audio file.
    - The filename should be sensible (e.g., `[EbookTitle]_Chapter_[Number]_[ChapterTitle].mp3`).
- **FR3.3 (Download All Button - Optional):** If implemented, a "Download All" button shall be available for a processed audiobook.
- **FR3.4 (Download All Action - Optional):** Clicking "Download All" shall initiate the download of a ZIP file containing all MP3 audio chapters for that audiobook.
    - The ZIP filename should be sensible (e.g., `[EbookTitle]_Audiobook.zip`).
- **FR3.5 (UI Polish - Visual Consistency):** The application shall have a consistent visual theme (colors, fonts, component styles) applied across all views, leveraging Material UI's theming capabilities and Tailwind CSS.
- **FR3.6 (UI Polish - Layout & Spacing):** Layouts shall be well-organized, with appropriate spacing and alignment to improve readability and aesthetics.
- **FR3.7 (UI Polish - User Feedback):** Enhanced visual feedback for actions:
    - More descriptive loading indicators (e.g., progress bars if feasible for long operations, or more engaging spinners).
    - Non-modal notifications/toasts for success (e.g., "Audio generation complete!") and error messages.
- **FR3.8 (Responsiveness):** All UI views and components shall be responsive and adapt gracefully to different screen sizes (common desktop, tablet, and mobile viewports).
- **FR3.9 (Accessibility):** Basic accessibility best practices shall be applied:
    - Semantic HTML elements.
    - Sufficient color contrast.
    - Keyboard navigability for interactive elements.
    - ARIA attributes where appropriate for custom components.

### 4.2. Backend (Supabase Edge Functions)

- **FR3.10 (Audio File Accessibility):** Audio files stored in Supabase Storage must be configured to allow direct download by the user's browser. This might involve ensuring files have correct `Content-Disposition` headers or using public URLs.
    - If buckets are private, Edge Functions may need to generate and return short-lived signed URLs for download requests.
- **FR3.11 (ZIP Generation - Optional):** If "Download All" is implemented, the `zip-chapters` Edge Function shall:
    - Accept an `ebook_id`.
    - Retrieve all associated audio chapter files from Supabase Storage.
    - Create a ZIP archive containing these files in memory or temporary storage.
    - Return the ZIP file to the client with appropriate headers for download.

### 4.3. Analytics/Logging (Basic)

- **FR3.12 (Event Logging):** Basic client-side logging for key user events to a simple logging service or `console.log` for MVP (if no dedicated service is set up). Events include:
    - File type uploaded (`txt`, `epub`, `pdf`).
    - Audio generation initiated.
    - Audio generation succeeded/failed (with error type if failed).
    - Chapter downloaded.

## 5. Non-Functional Requirements (for this slice)

- **NFR3.1 (Performance - Download):** Downloads should start promptly after clicking the button.
- **NFR3.2 (Usability - Overall):** The application should feel intuitive, polished, and trustworthy.
- **NFR3.3 (Responsiveness - Experience):** The user experience should be consistent and effective across supported device viewports.

## 6. Acceptance Criteria

- **AC3.1:** User can successfully download an individual audio chapter, and the downloaded MP3 file is playable.
- **AC3.2 (Optional):** User can successfully download a ZIP file containing all chapters, and the ZIP file contains correct, playable MP3s.
- **AC3.3:** The application UI exhibits a consistent and professional visual design (theme, typography, spacing).
- **AC3.4:** User receives clear visual feedback (loading states, success/error notifications) for all major actions.
- **AC3.5:** The application is usable and looks good on standard desktop, tablet (e.g., iPad portrait/landscape), and mobile (e.g., iPhone/Android portrait) screen sizes.
- **AC3.6:** Interactive elements are keyboard navigable, and basic accessibility checks pass (e.g., color contrast).
- **AC3.7:** Basic analytics events are logged as specified.

## 7. Assumptions & Dependencies

- Core functionality from Slices 1 and 2 is stable and complete.
- Design guidelines or mockups for UI polish are available or will be developed iteratively.
- (For ZIP) A suitable library for server-side ZIP creation is available for Supabase Edge Functions (Deno environment).

This slice focuses on delivering the final pieces of core MVP functionality and ensuring the application is presentable and user-friendly.

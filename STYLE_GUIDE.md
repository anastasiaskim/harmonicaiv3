# AI Audiobook Web App Programming Style Guide

## 1. General Principles

- **Consistency:** Follow consistent patterns and conventions throughout the codebase.
- **Readability:** Write clear, self-explanatory code. Prioritize readability over cleverness.
- **Simplicity:** Prefer simple, straightforward solutions (KISS).
- **DRY:** Avoid code duplication by extracting reusable logic.
- **YAGNI:** Only implement features required by the MVP/PRD.
- **Testability:** Write code that is easy to test.
- **Security:** Sanitize inputs, handle secrets securely, and follow best practices.

---

## 2. Folder & File Structure

- **src/**
  - **components/**: Reusable UI components (e.g., FileUpload, VoiceSelector, AudioPlayer)
  - **features/**: Feature-based folders (e.g., upload, conversion, playback)
  - **pages/**: Route-based components (e.g., Home, Conversion, Download)
  - **store/**: Redux slices, middleware, selectors
  - **hooks/**: Custom React hooks
  - **api/**: API clients (Supabase, Edge Functions, ElevenLabs)
  - **utils/**: Utility functions (file parsing, validation, text splitting)
  - **types/**: TypeScript types and interfaces
  - **App.tsx**: Main app shell and routing
  - **index.tsx**: Entry point

---

## 3. Naming Conventions

- **Files & Folders:**
  - Use `camelCase` for files and folders (e.g., `fileUpload.tsx`, `voiceSelector.tsx`).
  - Use `PascalCase` for React components (e.g., `AudioPlayer.tsx`).
- **Variables & Functions:**
  - Use `camelCase` (e.g., `handleUpload`, `selectedVoice`).
- **Types & Interfaces:**
  - Use `PascalCase` and prefix interfaces with `I` if appropriate (e.g., `IAudioChapter`).
- **Constants:**
  - Use `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`).

---

## 4. React & TypeScript

- Use **functional components** and React hooks.
- Type all props, state, and function signatures.
- Use `useState`, `useEffect`, `useCallback`, and custom hooks for logic.
- Prefer composition over inheritance.
- Use **default exports** for components unless multiple exports are needed.
- Use **PropTypes** only for third-party JS components; rely on TypeScript for type safety.
- Use **React Query** for all data fetching/mutations.
- Use **Redux Toolkit** for global state only if necessary (e.g., user session, app-wide settings).
- Use **MUI** and **Tailwind** for styling; avoid inline styles except for dynamic cases.
- Ensure all components are **accessible** (ARIA labels, keyboard navigation).

---

## 5. API & Data Layer

- Use **Supabase JS client** for DB/storage interactions.
- Use **Edge Functions** for server-side logic (file parsing, TTS orchestration).
- Use **async/await** for all asynchronous code.
- Handle errors with try/catch and provide user-friendly messages.
- Never expose API keys or secrets to the client.
- Use **React Query** for API calls, with proper loading and error states.

---

## 6. Styling

- Use **MUI** for layout and structure; use **Tailwind** for utility classes and custom styles.
- Prefer MUI's theme and style system for consistency.
- Avoid overriding MUI styles unless necessary.
- Use semantic HTML elements.

---

## 7. Testing

- Use **Jest** and **React Testing Library** for unit and integration tests.
- Write tests for all critical components, hooks, and utility functions.
- Use **mocking** for API calls and external services.
- Place tests alongside the code they test in `__tests__` folders or with `.test.ts(x)` suffix.

---

## 8. Documentation

- Use clear, concise comments for complex logic.
- Write JSDoc/TSDoc comments for exported functions and types.
- Maintain a `README.md` with setup, usage, and deployment instructions.
- Document all environment variables in `.env.example`.

---

## 9. Security & Best Practices

- Sanitize all user inputs (file uploads, text fields).
- Use HTTPS for all network communication.
- Store secrets in environment variables; never commit them to source control.
- Implement rate limiting in Edge Functions to prevent abuse.
- Use Supabase RLS for data access control.

---

## 10. Code Review & CI/CD

- All code must be peer-reviewed before merging.
- Use automated CI to run tests and lint checks on pull requests.
- Enforce code formatting with Prettier and linting with ESLint.

---

## 11. Example Component Skeleton

```tsx
// src/components/AudioPlayer.tsx
import React from 'react';

interface AudioPlayerProps {
  src: string;
  title: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title }) => (
  <div className="audio-player">
    <h3>{title}</h3>
    <audio controls src={src} aria-label={`Audio for ${title}`} />
  </div>
);
```

---

## 12. References

- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Query](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)
- [MUI Docs](https://mui.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs) 
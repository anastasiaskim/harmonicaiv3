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
    - React, TypeScript, MUI, Tailwind, React Router, Redux Toolkit, React Query.
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
    - UI Components (MUI)
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

1. User interacts with UI (Presentation Layer).
2. UI dispatches actions to Redux store (Application Layer - Front-End).
3. UI uses React Query to fetch data from API endpoints (Application Layer - Front-End).
4. API endpoints (Supabase Edge Functions) receive requests (Domain Layer).
5. Edge Function orchestrates use cases, which may involve:
    - Calling ElevenLabs API to generate audio (Infrastructure Layer).
    - Interacting with Supabase Storage to store audio (Infrastructure Layer).
    - Interacting with Supabase PostgreSQL database (Infrastructure Layer).
6. Edge Function returns response to UI (Presentation Layer).
7. UI updates based on response data.

---

## V. Technology-Specific Guidelines

- **React + TypeScript:** Functional components with hooks, strict typing.
- **Redux Toolkit:** For global state if needed; keep store simple.
- **MUI/Tailwind:** Use for consistent, accessible UI.
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
- **Testing:** Unit and integration tests (Jest, Vitest).
- **Performance:** Code splitting, asset compression, optimize queries.

---

## VII. Deployment

- **Front-End:** Deploy to Vercel/Netlify.
- **Back-End:** Deploy Supabase Edge Functions to Supabase.
- **Environment Variables:** Configure securely in deployment environment.
- **CI/CD:** Automate build, test, and deployment (GitHub Actions, etc.).

---

## VIII. Extensibility & Scalability

- Modular, feature-based code structure.
- API versioning for Edge Functions.
- Environment config for all secrets/endpoints.
- Ready for user auth, persistent libraries, advanced voice settings, and analytics in future iterations. 
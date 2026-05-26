# MediRAG AI — Agents.md

## Project Identity

**Name:** `medical-rag-frontend` (v0.1.0)
**Purpose:** Frontend for a Medical RAG (Retrieval-Augmented Generation) system. Users upload medical textbooks as PDFs, track ingestion/extraction jobs, and ask medical questions that are answered using only the content of those uploaded documents.
**Backend:** Python FastAPI at `http://localhost:8000` (configurable via `NEXT_PUBLIC_API_URL` env var).

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.1 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Language | TypeScript 5.7 (strict mode) |
| State | React Context API (no external state library) |
| Auth | JWT stored in `localStorage`, role decoded from base64 payload |
| Build | `output: "standalone"` for self-contained deployment |
| Path alias | `@/*` → `./src/*` |

**Zero extra runtime dependencies** — only Next.js, React, React-DOM, and Tailwind. No UI libraries, no state management libs, no HTTP clients.

## Route Map

| Path | Page | Access | Purpose |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Public | Splash redirect — authenticated → `/chat`, unauthenticated → `/login` |
| `/login` | `src/app/login/page.tsx` | Unauthenticated | Split-screen login page (branding left, form right) |
| `/chat` | `src/app/chat/page.tsx` | All roles | Chat interface + maintainer sidebar (upload + job status) |
| `/uploads` | `src/app/uploads/page.tsx` | Maintainer | Upload management with drop zone, filterable table, retry |
| `/status` | `src/app/status/page.tsx` | Maintainer | Job progress cards (active + history), retry |
| `/users` | `src/app/users/page.tsx` | Maintainer | User CRUD (create, toggle role/active, delete) |

### Route Guards
- All pages are `"use client"` components.
- Auth guard: `useEffect(() => { if (!loading && !user) router.replace("/login"); }, ...)`
- Role guard (maintainer-only routes): `useEffect(() => { if (user?.role !== "maintainer") router.replace("/chat"); }, ...)`
- Login page: if already authenticated, redirects to `/chat`.

## Component Hierarchy

```
RootLayout (layout.tsx)
└── AuthProvider (context)
    └── ToastProvider (context)
        ├── [page content]
        └── ToastContainer (fixed overlay)

DashboardLayout (all authenticated pages)
├── Sidebar          — logo, nav links (role-filtered), user footer
├── TopBar           — hamburger (mobile), user badge, sign-out
└── <main>           — scrollable content area
```

**Chat page specifically:**
```
DashboardLayout
└── div.flex (horizontal split)
    ├── div.chat-area (left)
    │   ├── Chat header
    │   ├── Messages list (ChatBubble components)
    │   ├── Suggested questions (empty state)
    │   └── Input form + Send button
    └── aside (right, maintainer-only, xl:flex)
        ├── Upload drop zone (drag-and-drop PDFs)
        └── Active jobs list with status badges + retry
```

## Component Inventory

| Component | File | Purpose |
|---|---|---|
| `RootLayout` | `src/app/layout.tsx` | Wraps all pages with providers |
| `LoginPage` | `src/app/login/page.tsx` | Split-screen login with SVG illustrations |
| `ChatPage` | `src/app/chat/page.tsx` | Chat streaming + upload sidebar |
| `UploadsPage` | `src/app/uploads/page.tsx` | Upload table + drop zone |
| `StatusPage` | `src/app/status/page.tsx` | Job progress cards |
| `UsersPage` | `src/app/users/page.tsx` | User CRUD |
| `DashboardLayout` | `src/components/layout/DashboardLayout.tsx` | App shell |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Navigation with role filtering |
| `TopBar` | `src/components/layout/TopBar.tsx` | Header bar |
| `Modal` | `src/components/ui/Modal.tsx` | Generic overlay modal |
| `Spinner` | `src/components/ui/Spinner.tsx` | Animated SVG spinner |
| `StatusBadge` | `src/components/ui/StatusBadge.tsx` | Color-coded status pill |
| `ToastContainer` | `src/components/ToastContainer.tsx` | Toast notification stack |

## Context (State Management)

### AuthContext (`src/context/AuthContext.tsx`)
- **State:** `user: AuthUser | null`, `token: string | null`, `loading: boolean`
- **Actions:** `login(creds)`, `logout()`
- **Storage:** `localStorage` keys: `auth_token`, `auth_user`
- **Token handling:** JWT decoded client-side — `role` extracted from `payload.role` (base64 parse of `token.split('.')[1]`)
- **Expiry:** 401 responses dispatch `window.dispatchEvent(new Event("auth-expired"))` → AuthContext clears state
- **Exports:** `useAuth()` hook, `useRequireRole(...roles)` guard hook
- **User types:** `"user"` | `"maintainer"`

### ToastContext (`src/context/ToastContext.tsx`)
- **State:** `toasts: { id, type: "success"|"error"|"info", message }[]`
- **Actions:** `addToast(type, message)` — auto-dismisses after 4 seconds
- **Consumer:** `ToastContainer` renders fixed-position stack (bottom-right)

## API Layer (`src/lib/api.ts`)

**Base URL:** `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)
**Auth:** `Authorization: Bearer <token>` header on all authenticated requests

### All API Functions

| Function | Method | Path | Notes |
|---|---|---|---|
| `login(body)` | POST | `/auth/login` | Returns `TokenResponse` |
| `uploadPdfs(files)` | POST | `/uploads/upload-pdf` | Multipart `FormData` |
| `fetchUploadsList(status?, limit?, offset?)` | GET | `/uploads` | Query params |
| `fetchUploadJob(jobId)` | GET | `/uploads/{jobId}` | |
| `retryJob(jobId)` | POST | `/uploads/{jobId}/retry` | Resets FAILED → QUEUED |
| `fetchRunningJob()` | GET | `/uploads/running` | |
| `createUser(body)` | POST | `/users` | |
| `listUsers()` | GET | `/users` | |
| `updateUser(userId, body)` | PATCH | `/users/{userId}` | |
| `deleteUser(userId)` | DELETE | `/users/{userId}` | |
| `streamAsk(question, signal?)` | POST | `/ask?stream=true` | SSE via `ReadableStream`, returns `AsyncGenerator<StreamEvent>` |

### API Patterns
- Generic wrapper `apiFetch<T>(path, options)` handles JSON parsing and 401 interception
- Login uses bare `fetch` (no auth header needed)
- Upload uses bare `fetch` (multipart FormData, no Content-Type override)
- `streamAsk` uses custom SSE parser: `ReadableStream.getReader()` → `TextDecoder` → split on `\n\n` → parse `data:` lines

## Job Status Lifecycle

```
QUEUED → RUNNING → COMPLETED
                 → FAILED
FAILED → QUEUED   (via retryJob)
```

- `isActiveStatus(s)` = `true` for QUEUED | RUNNING
- `isTerminalStatus(s)` = `true` for COMPLETED | FAILED

## Design System

**CSS custom properties (globals.css):**
```css
--bg: #f8fafc         /* Page background */
--surface: #ffffff    /* Card/table background */
--surface-2: #f8fafc  /* Secondary surface */
--border: #e2e8f0     /* Border color */
--text: #0f172a       /* Primary text */
--muted: #64748b      /* Secondary/muted text */
--accent-dim: #2563eb /* Primary blue */
--success: #059669    /* Green */
--warn: #d97706       /* Amber */
--error: #dc2626      /* Red */
```

**Status pill colors (in `types.ts`):**
- QUEUED: slate
- RUNNING: blue (with pulsing dot)
- COMPLETED: emerald
- FAILED: red

**Animations (globals.css utility classes):**
- `.animate-fade-in` — fade + slide up (0.2s)
- `.animate-slide-up` — slide up (0.25s)
- `.animate-progress` — horizontal shimmer bar (indeterminate progress)
- `.animate-pulse-glow` — blue glow pulse
- `.animate-float` / `.animate-float-delayed` / `.animate-float-slow` — gentle floating (8-12s)
- `.line-clamp-2` — 2-line text truncation

**Typography:** Font stack: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif
**Scrollbar:** Custom thin scrollbars (5px wide, rounded, muted color)

## Coding Conventions

- **All components are `"use client"`** — no server components used.
- **TypeScript strict mode** — `noUnusedLocals`, `noUnusedParameters` are NOT enabled (so unused vars are okay).
- **Interfaces** for object shapes, **`type`** for unions/enums.
- **Loading states** use named booleans: `loading`, `busy`, `sending`, `uploading`, `creating`, `refreshing`, `retryingId`.
- **Error handling:** `try/catch` with `err instanceof Error ? err.message : fallback`.
- **Fire-and-forget:** `void functionName()` pattern (not `.then()`).
- **Empty states:** Centered messages with emoji, dashed border containers.
- **Mobile responsive:** Sidebar slides over on mobile (translate-x), static on desktop. Tables hide columns progressively (sm/md/lg breakpoints).
- **No polling** — all pages use manual refresh buttons (per taste preference: "Avoid polling for data refreshes; use manual refresh buttons with icons instead").
- **Path imports:** Always use `@/` alias, never relative paths.
- **No comments in code** unless explicitly requested.
- **Prefer existing patterns** — follow conventions established in the codebase rather than introducing new patterns.

## Retry Pattern

All three job views (uploads table, status cards, chat sidebar) support retrying failed jobs:
- Each view maintains a `retryingId` state to track which job is being retried
- Retry button shows spinning refresh icon + "Retrying…" text while in progress
- After retry, calls the page's data loading function to refresh the list
- Button is `disabled` while that specific job is retrying

## Navigation Items (Role-Based)

```ts
// From NAV_ITEMS in types.ts
{ label: "Chat & Upload", href: "/chat", icon: "💬", roles: ["maintainer", "user"] }
{ label: "Upload Management", href: "/uploads", icon: "📋", roles: ["maintainer"] }
{ label: "Status Monitor", href: "/status", icon: "📊", roles: ["maintainer"] }
{ label: "Users", href: "/users", icon: "👥", roles: ["maintainer"] }
```

Sidebar filters these by `user.role`. Non-maintainer sees only "Chat & Upload".

## File Structure

```
src/
├── app/
│   ├── globals.css          # Design tokens, base styles, animations
│   ├── layout.tsx           # Root layout (AuthProvider + ToastProvider)
│   ├── page.tsx             # Splash redirect
│   ├── chat/page.tsx        # Chat + upload sidebar
│   ├── login/page.tsx       # Login page
│   ├── status/page.tsx      # Status monitor
│   ├── uploads/page.tsx     # Upload management
│   └── users/page.tsx       # User management
├── components/
│   ├── ToastContainer.tsx
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── ui/
│       ├── Modal.tsx
│       ├── Spinner.tsx
│       └── StatusBadge.tsx
├── context/
│   ├── AuthContext.tsx
│   └── ToastContext.tsx
└── lib/
    ├── api.ts               # All API functions + fetch wrapper + SSE parser
    └── types.ts             # All types, interfaces, constants, helpers
```

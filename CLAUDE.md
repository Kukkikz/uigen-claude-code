# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code style

Use comments sparingly. Only comment complex code.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run all tests with Vitest
npm run setup        # Install deps + Prisma setup + run migrations
npm run db:reset     # Force reset Prisma database
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

Test config: `vitest.config.mts`

## Environment

Requires an `.env` file with:
- `ANTHROPIC_API_KEY` — if absent, falls back to a `MockLanguageModel` returning static responses (no real AI generation)
- `JWT_SECRET` — falls back to `"development-secret-key"` if unset

## Architecture

UIGen is an AI-powered React component generator with live in-browser preview. Users describe a component in chat; Claude generates code into a virtual file system; the preview iframe renders it in real-time.

### Data flow

```
User message
  → ChatContext (wraps Vercel AI SDK useChat)
  → POST /api/chat  (src/app/api/chat/route.ts)
      - streamText with Claude Haiku 4.5
      - tools: str_replace_editor, file_manager
  → FileSystemContext processes tool call results
      - updates virtual in-memory file system
  → PreviewFrame re-renders iframe with new file system state
```

### Key abstractions

**Virtual File System** (`src/lib/file-system.ts`)
Entirely in-memory; no disk I/O. Supports full path hierarchies, serialize/deserialize for persistence, and text-editor commands (`viewFile`, `replaceInFile`, `insertInFile`). The AI always targets `/App.jsx` as the root component.

**FileSystemContext** (`src/lib/contexts/file-system-context.tsx`)
React context providing file CRUD and handling AI tool call responses (`str_replace_editor`, `file_manager`).

**ChatContext** (`src/lib/contexts/chat-context.tsx`)
Wraps `useChat` from Vercel AI SDK; sends the serialized file system state with every message.

**AI Tools** (`src/lib/tools/`)
- `str-replace.ts` — view, create, str_replace, insert operations on virtual files
- `file-manager.ts` — rename and delete operations

**Provider** (`src/lib/provider.ts`)
`getLanguageModel()` returns Claude Haiku 4.5 when `ANTHROPIC_API_KEY` is set; otherwise returns `MockLanguageModel` for demo/dev.

**In-Browser JSX Transform** (`src/lib/transform/jsx-transformer.ts`)
Uses Babel Standalone to transform JSX into executable JS inside the iframe. Creates import maps for module resolution. This is how the preview works without a bundler.

**Persistence** (`src/actions/`, `prisma/`)
SQLite via Prisma. `Project` stores messages and file system state as JSON blobs. Only persists when a user is authenticated and a `projectId` is present — the app works fully offline/anonymous otherwise. The database schema is defined in `prisma/schema.prisma`.

**Authentication** (`src/lib/auth.ts`, `src/actions/index.ts`)
JWT sessions (7-day) in httpOnly cookies. Server actions handle sign-up, sign-in, sign-out, getUser. No external auth provider.

### Path alias

`@/*` maps to `./src/*` (defined in `tsconfig.json`).

### UI components

shadcn/ui components live in `src/components/ui/`. The layout uses `react-resizable-panels` with a chat panel (35%) and a code/preview panel (65%).

### AI prompt

The system prompt at `src/lib/prompts/generation.tsx` instructs Claude to always create `/App.jsx` as root, use Tailwind CSS, and use `@/` import aliases. Max 40 tool-use steps per request (4 for mock provider).

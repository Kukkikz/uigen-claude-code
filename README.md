# UIGen

AI-powered React component generator with live in-browser preview. Describe a UI component in plain language and watch Claude generate it in real time.

## Features

- **AI-powered generation** — Claude Haiku 4.5 writes and edits React components based on your descriptions
- **Live preview** — components render instantly in an isolated iframe using Babel Standalone (no bundler required)
- **Virtual file system** — files exist only in memory; nothing is written to disk
- **Monaco code editor** — view and manually edit generated files with syntax highlighting
- **Project persistence** — authenticated users have their projects saved automatically
- **Anonymous use** — works fully without signing in
- **Iterative refinement** — continue the conversation to adjust and improve components

## How It Works

```
User message
  → ChatContext (Vercel AI SDK useChat)
  → POST /api/chat
      - streamText with Claude Haiku 4.5
      - tools: str_replace_editor, file_manager
  → FileSystemContext processes tool results
      - updates virtual in-memory file system
  → PreviewFrame re-renders iframe
      - Babel transforms JSX → JS in-browser
      - import maps resolve module references
```

The AI always targets `/App.jsx` as the root component and uses Tailwind CSS with `@/` import aliases.

## Prerequisites

- Node.js 18+
- npm

## Setup

1. Copy the environment file and add your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required for real AI generation; omit to use static mock responses
ANTHROPIC_API_KEY=your-api-key-here

# Optional; falls back to "development-secret-key" if unset
JWT_SECRET=your-jwt-secret
```

> **No API key?** The app runs without one using a `MockLanguageModel` that returns static responses — useful for development and testing.

2. Install dependencies and initialize the database:

```bash
npm run setup
```

This installs packages, generates the Prisma client, and runs database migrations.

## Running the Application

```bash
# Development (Turbopack)
npm run dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Open the app — no sign-in required to get started
2. Type a description of the React component you want in the chat panel
3. Watch the live preview update as Claude generates the code
4. Switch to the **Code** tab to view or edit the generated files
5. Keep chatting to refine the component iteratively
6. Sign up to save your projects across sessions

## Development

```bash
npm run lint        # ESLint
npm run test        # Vitest (all tests)

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Reset the database
npm run db:reset
```

## Project Structure

```
src/
├── app/
│   ├── api/chat/         # AI streaming endpoint
│   ├── [projectId]/      # Authenticated project pages
│   └── page.tsx          # Root — redirects authenticated users to their project
├── components/
│   ├── chat/             # Chat UI (message list, input, tool call badges)
│   ├── editor/           # Monaco code editor and file tree
│   ├── preview/          # Iframe renderer
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── contexts/         # FileSystemContext, ChatContext
│   ├── tools/            # AI tool definitions (str_replace_editor, file_manager)
│   ├── transform/        # JSX → JS in-browser transform (Babel Standalone)
│   ├── prompts/          # AI system prompt
│   ├── auth.ts           # JWT session handling
│   └── provider.ts       # Language model selection (Claude or Mock)
├── actions/              # Server actions (auth, project CRUD)
└── generated/            # Prisma client (auto-generated)
prisma/
└── schema.prisma         # SQLite schema (User, Project)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| AI | Anthropic Claude Haiku 4.5, Vercel AI SDK |
| Editor | Monaco Editor |
| In-browser transform | Babel Standalone |
| Database | SQLite via Prisma |
| Auth | JWT (httpOnly cookies, 7-day sessions) |
| Testing | Vitest, Testing Library |
| Language | TypeScript |

# GitWiki Backend

This is the Express API for GitWiki. It authenticates requests with Clerk, indexes GitHub repositories into Pinecone, stores chat/job metadata in PostgreSQL via Prisma, and runs background jobs through Inngest.

## What this service does

- Exposes the backend API used by the Next.js frontend
- Verifies authenticated Clerk sessions before indexing or chat requests
- Lists repositories and fetches repo contents through Octokit
- Splits code into chunks and stores embeddings in Pinecone
- Creates long-running indexing and Q&A jobs with Inngest
- Persists chat history and job metadata with Prisma/Postgres

## Stack

- Node.js + Express
- Prisma + PostgreSQL
- Clerk auth
- Inngest
- OpenAI for embeddings and chat completion
- Pinecone for vector search
- GitHub REST API via Octokit

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL instance
- Clerk app with GitHub OAuth enabled
- OpenAI API key
- Pinecone API key
- GitHub token (recommended for private repos and repo listing)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file:

```bash
copy .env.example .env
```

3. Fill in your credentials in `.env`.

4. Generate Prisma client and apply schema:

```bash
npx prisma generate
npx prisma db push
```

5. Start the API:

```bash
npm start
```

6. In another terminal, start the Inngest dev server:

```bash
npm run inngest:dev
```

The backend listens on:

- http://localhost:8000

## Environment variables

The app reads the following variables from the environment:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/gitwiki"
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
OPENAI_API_KEY="sk-..."
PINECONE_API_KEY="..."
PINECONE_INDEX="git-wiki"
GITHUB_TOKEN="github_pat_..."
```

Notes:

- `DATABASE_URL` is required for Prisma.
- `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are required for authenticated routes.
- `OPENAI_API_KEY` and `PINECONE_API_KEY` are required for embeddings and chat retrieval.
- `GITHUB_TOKEN` is optional for a request-level override, but useful for listing and indexing repos.
- `PINECONE_INDEX` defaults to `git-wiki` when not set.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/` | Health check |
| GET | `/api/auth/me` | Returns the Clerk-authenticated user ID |
| GET | `/api/repos` | Lists repositories for the authenticated user |
| POST | `/api/index` | Starts repository indexing |
| GET | `/api/index/:jobId` | Checks indexing job status |
| POST | `/api/chat` | Starts a chat job |
| GET | `/api/chat/:jobId` | Checks chat job status |
| GET | `/api/chat/history` | Gets previous chat messages for a repo |
| DELETE | `/api/chat/history` | Clears chat history for a repo |
| GET/POST | `/api/inngest` | Inngest registration and event handling |

## Background jobs

The app registers these Inngest functions:

- `indexRepo`: fetches repository files, chunks them, and upserts embeddings into Pinecone
- `askQuestionFn`: retrieves similar chunks and asks the OpenAI model for an answer

Both jobs are asynchronous and return immediately while work continues in the background.

## Important implementation notes

- The server uses `express.json({ limit: "10mb" })` for larger Inngest payloads.
- Auth-protected routes use `requireUser` and Clerk middleware.
- Repo file scanning ignores directories like `node_modules`, `.git`, `dist`, `build`, and large/binary files.
- Repository embeddings are namespaced by repo name, using `owner-repository` style keys.

## Security

Do not commit `.env` files or expose secrets in logs or source control. Use `.env.example` as the safe template for local setup.

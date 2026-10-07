<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Local PostgreSQL 16 is part of the environment. Use it for development instead of a hosted Supabase database.

- Boot startup starts PostgreSQL, creates the `production` role and database when missing, writes a gitignored `.env` when missing, applies Prisma migrations, seeds sample data, and runs `pnpm dev` on port 3000.
- App URL: http://localhost:3000. Sign in with `manager@example.com` / `Manager123!`.
- `pnpm test` covers pure rules and database rules. `pnpm lint` runs ESLint.

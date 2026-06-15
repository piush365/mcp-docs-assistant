# Status — MCP TypeScript SDK Doc Assistant

**What this is:** A version-correct, refusal-disciplined documentation assistant for the **MCP TypeScript SDK** (`@modelcontextprotocol/sdk`). Agentic RAG over the SDK docs that answers "how do I do X?" with **version-correct (v1 vs v2), cited** answers and **refuses** when the docs don't cover something. Portfolio piece for General SWE + AI roles.

**Differentiator:** Context7 / DeepWiki index these docs but aren't version-aware and won't refuse, and there's no official MCP doc bot. The v1 (`@modelcontextprotocol/sdk@1.29.0`) vs v2 (`2.0.0-alpha` — split `@modelcontextprotocol/server`/`client`/`node` packages, `server.tool()` → `registerTool()`, SSE → Streamable HTTP) split is the moat.

---

## Current status: Plan 1 (Foundation) — code complete, DB steps pending

**✅ Done, tested, committed:**
- Next.js 16 + AI SDK v6 + Drizzle + Vitest scaffold
- Ingestion pipeline: clone SDK repo @ `v1.29.0` → read `docs/*.md` + `README.md` → chunk by heading → embed → pgvector
- Cited cosine retrieval (`lib/retrieve/search.ts`)
- **9/9 unit tests pass** (chunk 5, read 3, citation 1); **typecheck clean**

**⏳ Blocked on credentials** (need a real Postgres + AI Gateway key):
- `pnpm db:setup` — create the pgvector extension
- `pnpm db:push` — create the `chunks` table
- `pnpm ingest` — populate the store from the SDK docs
- integration test + `pnpm ask` smoke

---

## To finish Plan 1 (~3 min)

1. Create a free Neon Postgres project → https://neon.com → copy the connection string.
2. Fill `.env` (gitignored — safe):
   ```
   DATABASE_URL=postgresql://…?sslmode=require
   AI_GATEWAY_API_KEY=…
   ```
3. Run:
   ```bash
   pnpm db:setup && pnpm db:push && pnpm ingest && pnpm test && pnpm ask "how do I register a tool on an MCP server?"
   ```
   Expect: ranked doc chunks with `[v1] … github.com/modelcontextprotocol/typescript-sdk/blob/v1.29.0/…` citations. That's the "it works" moment.

---

## Roadmap (full detail in the plan)

Plan file: `docs/superpowers/plans/2026-06-15-foundation-ingestion-retrieval.md`

- **Plan 2** — ingest **v2** (`2.0.0-alpha`) at its own git ref tagged `version: 'v2'`; add the protocol-spec corpus (spec site is Mintlify → `.md`-append trick works); agentic layer (`generateText` + `searchDocs` tool, `stopWhen: stepCountIs`); **version-correctness + refusal** (the differentiator); SSE → Streamable HTTP disambiguation; hybrid search + `rerank`.
- **Plan 3** — chat UI (`useChat` + `DefaultChatTransport` + `toUIMessageStreamResponse`).
- **Plan 4** — eval harness (golden set mined from the repo's `bug`/`question` issues, tagged v1/v2 + should-refuse) + benchmark vs Context7/DeepWiki.
- **Plan 5** — deploy + publish the assistant itself as an MCP server to the official registry. Switch to OIDC auth via `vercel env pull`.

---

## Resuming in a fresh Claude Code session

Open Claude Code **in this folder** and say:

> Read `STATUS.md` and `docs/superpowers/plans/2026-06-15-foundation-ingestion-retrieval.md`. Continue from the pending DB steps, then Plan 2.

The plan is self-contained (written for an engineer with zero context), so a new session picks it up cleanly. Everything is in git.

---

## Key facts (don't re-derive)

- Pinned SDK ref: **`v1.29.0`** (recent tags use the `v` prefix; verified via `git ls-remote --tags`).
- Embeddings: `openai/text-embedding-3-small` (1536-dim) via Vercel AI Gateway (`embed` / `embedMany` from `ai`).
- Store: Neon Postgres + pgvector; HNSW `vector_cosine_ops`; similarity = `1 - cosineDistance`.
- Docs are ingested by **cloning the repo** (the docs site `ts.sdk.modelcontextprotocol.io` is TypeDoc — no `llms.txt`/sitemap, do not scrape). Clone lands in `.cache/mcp-sdk` (gitignored).
- `chunks` columns: `content, heading, url, version ('v1'|'v2'), source ('sdk-docs'|'readme'|'spec'), embedding`.
- Implementation notes vs the plan: `formatCitation` lives in `lib/retrieve/citation.ts` (pure, no DB import, so its test runs without creds); `lib/db/client.ts` is lazy-init (importing it doesn't require `DATABASE_URL`).
- Env: a single `.env` (gitignored) loaded everywhere via `lib/load-env.ts`. `.env.example` is the committed template.

# Deploy & Operate

This app is a Next.js 16 project. Three surfaces ship from one codebase:

- **Web chat** — `app/` (the `/api/chat` streaming route + UI).
- **CLI** — `pnpm ask` / `pnpm answer` / `pnpm eval`.
- **MCP server** — `pnpm mcp` (publishes the assistant as MCP tools).

---

## 1. Environment variables

| Var | Required | Used by |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres + pgvector (retrieval) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes | Gemini embeddings + chat + rerank |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | optional | turns on tracing (see §4) |

Local: a single `.env` (gitignored), template in `.env.example`.

---

## 2. Deploy the web app to Vercel

The repo is already on GitHub. Two ways:

**Dashboard (recommended):**
1. vercel.com → New Project → import the GitHub repo.
2. Framework auto-detects as Next.js. No `vercel.json` needed.
3. Add the env vars from §1 (Production + Preview).
4. Deploy. Preview URLs are created per push; promote to Production from the dashboard.

**CLI:**
```bash
npm i -g vercel
vercel link
vercel env add DATABASE_URL
vercel env add GOOGLE_GENERATIVE_AI_API_KEY
vercel --prod
```

> The DB must be seeded first: run `pnpm db:setup && pnpm db:push && pnpm ingest`
> against the same `DATABASE_URL` (Neon is reachable from anywhere). Ingest is a
> one-time offline step; the deployed app only reads.

---

## 3. Use the MCP server

The assistant is itself an MCP server (`mcp-server/index.ts`) exposing two tools:
`ask_mcp_docs` (full cited answer) and `search_mcp_docs` (raw retrieval).

Add it to an MCP client (e.g. Claude Desktop, `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-docs-assistant": {
      "command": "pnpm",
      "args": ["mcp"],
      "cwd": "/absolute/path/to/mcp-doc-assistant"
    }
  }
}
```

It speaks stdio JSON-RPC — keep stdout clean (this is why `lib/load-env.ts` uses
`quiet: true` and all logs go to stderr).

---

## 4. Observability (optional)

The agent already emits OpenTelemetry spans via `experimental_telemetry`
(`lib/agent/config.ts`), gated on `LANGFUSE_PUBLIC_KEY`. To export them to
Langfuse, register the exporter once at startup:

```bash
pnpm add @langfuse/otel @opentelemetry/sdk-node
```

```ts
// instrumentation.ts (Next.js auto-loads this)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

export function register() {
  new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] }).start();
}
```

Set `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`; every generation + tool call
then shows up in the Langfuse dashboard with token cost and latency.

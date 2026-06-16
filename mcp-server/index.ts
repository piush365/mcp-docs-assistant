import '../lib/load-env';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { answer } from '../lib/agent/answer';
import { hybridSearch } from '../lib/retrieve/search';
import { rerank } from '../lib/retrieve/rerank';

/**
 * The doc assistant, published as an MCP server — so an MCP client (Claude
 * Desktop, Cursor, …) can call it as a tool. Meta: an MCP tool whose job is
 * answering questions about the MCP SDK. Two tools:
 *   - ask_mcp_docs: full agentic, version-correct, cited answer (or a refusal).
 *   - search_mcp_docs: raw retrieval (hybrid + rerank) → cited chunks.
 *
 * Transport is stdio, so nothing may write to stdout except the JSON-RPC stream
 * (errors/logs go to stderr).
 */
const server = new McpServer({ name: 'mcp-docs-assistant', version: '1.0.0' });

server.registerTool(
  'ask_mcp_docs',
  {
    title: 'Ask the MCP TypeScript SDK docs',
    description:
      'Answer a "how do I…" question about the Model Context Protocol TypeScript SDK. ' +
      'Answers are version-correct (v1 vs v2), cite their sources, and refuse when the docs do not cover the question.',
    inputSchema: { question: z.string().describe('The question to answer.') },
  },
  async ({ question }) => {
    const { text } = await answer(question);
    return { content: [{ type: 'text', text }] };
  },
);

server.registerTool(
  'search_mcp_docs',
  {
    title: 'Search the MCP TypeScript SDK docs',
    description:
      'Retrieve the most relevant documentation chunks for a query, with citations. ' +
      'Optionally restrict to one SDK version.',
    inputSchema: {
      query: z.string().describe('The concept to look up.'),
      version: z.enum(['v1', 'v2']).optional().describe('Restrict to one SDK version.'),
    },
  },
  async ({ query, version }) => {
    const candidates = await hybridSearch(query, { version, limit: 12 });
    const results = await rerank(query, candidates, 6);
    if (results.length === 0) {
      return { content: [{ type: 'text', text: 'No relevant documentation found.' }] };
    }
    const text = results
      .map((r) => `• ${r.citation}\n  ${r.content.slice(0, 200).replace(/\n/g, ' ')}…`)
      .join('\n\n');
    return { content: [{ type: 'text', text }] };
  },
);

async function main() {
  await server.connect(new StdioServerTransport());
  // stderr only — stdout is the protocol channel.
  console.error('mcp-docs-assistant server running on stdio');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

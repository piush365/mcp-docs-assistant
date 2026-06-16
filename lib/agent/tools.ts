import { tool } from 'ai';
import { z } from 'zod';
import { hybridSearch } from '../retrieve/search';
import { hasConfidentMatch } from './gate';

/**
 * The one tool the agent has: semantic search over the ingested MCP SDK docs.
 *
 * Refusal is enforced here, not just in the prompt: when nothing clears the
 * confidence bar, we return `relevant: false` and no chunks, so the model has no
 * material to fabricate from and is steered to refuse.
 */
export const searchDocs = tool({
  description:
    'Search the Model Context Protocol TypeScript SDK documentation. Returns relevant doc chunks with citations. Call this before answering any question.',
  inputSchema: z.object({
    query: z.string().describe('The search query, phrased as the concept to look up.'),
    version: z
      .enum(['v1', 'v2'])
      .optional()
      .describe(
        'Restrict to one SDK version: v1 (1.x, server.tool, SSE) or v2 (2.0-alpha, registerTool, Streamable HTTP). Omit to search both.',
      ),
  }),
  execute: async ({ query, version }) => {
    const results = await hybridSearch(query, { version, limit: 6 });
    if (!hasConfidentMatch(results)) {
      return {
        relevant: false,
        note: 'No documentation chunks cleared the relevance threshold. The docs likely do not cover this — refuse rather than guess.',
        results: [],
      };
    }
    return {
      relevant: true,
      results: results.map((r) => ({
        citation: r.citation,
        version: r.version,
        similarity: Number(r.similarity.toFixed(3)),
        content: r.content,
      })),
    };
  },
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RetrievedChunk } from '../lib/retrieve/search';

// Mock the retrieval layer so the tool's refusal gate is testable without DB/creds.
const searchMock = vi.fn();
vi.mock('../lib/retrieve/search', () => ({
  hybridSearch: (...args: unknown[]) => searchMock(...args),
}));

const { searchDocs } = await import('../lib/agent/tools');

function chunk(similarity: number): RetrievedChunk {
  return {
    id: 1,
    content: 'Use registerTool().',
    heading: 'server > Tools',
    url: 'https://example/blob/x/docs/server.md',
    version: 'v2',
    source: 'sdk-docs',
    similarity,
    citation: '[v2] server > Tools — https://example/blob/x/docs/server.md',
  };
}

interface ToolOutput {
  relevant: boolean;
  results: Array<{ citation: string; version: string; similarity: number; content: string }>;
  note?: string;
}

// The tool's execute is what the agent invokes. Its declared return is a
// streaming union; this tool always resolves to a plain object, so we narrow.
const run = async (input: { query: string; version?: 'v1' | 'v2' }): Promise<ToolOutput> =>
  (await searchDocs.execute!(input, { toolCallId: 't', messages: [] })) as ToolOutput;

describe('searchDocs tool — refusal gate', () => {
  beforeEach(() => searchMock.mockReset());

  it('reports relevant:false with no results when nothing clears the confidence bar', async () => {
    searchMock.mockResolvedValue([chunk(0.2), chunk(0.4)]);
    const out = await run({ query: 'unrelated thing' });
    expect(out.relevant).toBe(false);
    expect(out.results).toEqual([]);
  });

  it('returns cited results when a confident match exists', async () => {
    searchMock.mockResolvedValue([chunk(0.72)]);
    const out = await run({ query: 'register a tool' });
    expect(out.relevant).toBe(true);
    expect(out.results).toHaveLength(1);
    expect(out.results[0].citation).toContain('[v2]');
  });

  it('forwards the version filter to search', async () => {
    searchMock.mockResolvedValue([chunk(0.7)]);
    await run({ query: 'transports', version: 'v2' });
    expect(searchMock).toHaveBeenCalledWith('transports', expect.objectContaining({ version: 'v2' }));
  });
});

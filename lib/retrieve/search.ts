import { embed } from 'ai';
import { and, cosineDistance, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { chunks } from '../db/schema';
import { embeddingModel, embedProviderOptions } from '../embed/model';
import { formatCitation } from './citation';
import { rrfFuse } from './rrf';

export interface RetrievedChunk {
  id: number;
  content: string;
  heading: string;
  url: string;
  version: string;
  source: string;
  /** Cosine similarity from the vector leg; 0 for lexical-only hits. */
  similarity: number;
  citation: string;
}

export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
  /** Restrict results to one SDK version. Omit to search across all versions. */
  version?: string;
}

export { formatCitation };

/** Candidate pool pulled from each leg before fusion. */
const CANDIDATES = 20;

/** Pure semantic (vector cosine) search. */
export async function search(
  query: string,
  { limit = 8, minSimilarity = 0.3, version }: SearchOptions = {},
): Promise<RetrievedChunk[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
    providerOptions: embedProviderOptions,
  });
  const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, embedding)})`;
  const where = version
    ? and(gt(similarity, minSimilarity), eq(chunks.version, version))
    : gt(similarity, minSimilarity);
  const rows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      heading: chunks.heading,
      url: chunks.url,
      version: chunks.version,
      source: chunks.source,
      similarity,
    })
    .from(chunks)
    .where(where)
    .orderBy((t) => desc(t.similarity))
    .limit(limit);

  return rows.map((r) => ({ ...r, citation: formatCitation(r) }));
}

/** Lexical (Postgres full-text) search. Strong on exact API names like `registerTool`. */
async function lexicalSearch(query: string, limit: number, version?: string): Promise<RetrievedChunk[]> {
  const tsv = sql`to_tsvector('english', ${chunks.content})`;
  const tsq = sql`plainto_tsquery('english', ${query})`;
  const match = sql`${tsv} @@ ${tsq}`;
  const rank = sql<number>`ts_rank(${tsv}, ${tsq})`;
  const where = version ? and(match, eq(chunks.version, version)) : match;
  const rows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      heading: chunks.heading,
      url: chunks.url,
      version: chunks.version,
      source: chunks.source,
      rank,
    })
    .from(chunks)
    .where(where)
    .orderBy(desc(rank))
    .limit(limit);

  // Lexical hits have no cosine similarity; 0 keeps them out of the refusal gate.
  return rows.map(({ rank: _rank, ...r }) => ({ ...r, similarity: 0, citation: formatCitation(r) }));
}

/**
 * Hybrid retrieval: fuse semantic + lexical rankings with RRF. The vector leg is
 * listed first so shared hits keep their cosine similarity, which is what the
 * refusal gate reads — a keyword-only coincidence can't pass the gate on its own.
 */
export async function hybridSearch(
  query: string,
  { limit = 8, minSimilarity = 0.3, version }: SearchOptions = {},
): Promise<RetrievedChunk[]> {
  const [vector, lexical] = await Promise.all([
    search(query, { limit: CANDIDATES, minSimilarity, version }),
    lexicalSearch(query, CANDIDATES, version),
  ]);
  return rrfFuse([vector, lexical], (r) => r.id).slice(0, limit);
}

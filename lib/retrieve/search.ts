import { embed } from 'ai';
import { and, cosineDistance, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { chunks } from '../db/schema';
import { embeddingModel, embedProviderOptions } from '../embed/model';
import { formatCitation } from './citation';

export interface RetrievedChunk {
  content: string;
  heading: string;
  url: string;
  version: string;
  source: string;
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

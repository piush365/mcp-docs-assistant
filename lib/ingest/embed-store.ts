import { embedMany } from 'ai';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { chunks as chunksTable, type NewChunk } from '../db/schema';
import { embeddingModel, embedProviderOptions } from '../embed/model';
import type { Chunk } from './chunk';

const BATCH = 96;

/** Delete all stored chunks for a version, so re-ingesting that version is idempotent. */
export async function clearVersion(version: string): Promise<void> {
  await db.delete(chunksTable).where(eq(chunksTable.version, version));
}

/** Embed chunks and insert them. Returns the number of rows written. */
export async function embedAndStore(chunks: Chunk[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: slice.map((c) => c.content),
      providerOptions: embedProviderOptions,
    });
    const rows: NewChunk[] = slice.map((c, j) => ({
      content: c.content,
      heading: c.heading,
      url: c.url,
      version: c.version,
      source: c.source,
      embedding: embeddings[j],
    }));
    await db.insert(chunksTable).values(rows);
    written += rows.length;
  }
  return written;
}

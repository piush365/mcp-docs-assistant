import '../lib/load-env';
import { cloneRepo, listDocFiles, SOURCES } from '../lib/ingest/repo';
import { readDocFile } from '../lib/ingest/read';
import { chunkMarkdown, type Chunk } from '../lib/ingest/chunk';
import { clearVersion, embedAndStore } from '../lib/ingest/embed-store';

async function main() {
  let total = 0;
  for (const source of SOURCES) {
    const repoRoot = cloneRepo(source);
    const files = listDocFiles(source);
    console.log(`\n[${source.version}] ${files.length} files @ ${source.gitRef}`);

    const chunks: Chunk[] = [];
    for (const file of files) {
      const doc = readDocFile(file, repoRoot, source);
      const docChunks = chunkMarkdown(doc);
      chunks.push(...docChunks);
      console.log(`  ${doc.title}: ${docChunks.length} chunks`);
    }

    // Idempotent: drop this version's rows before re-inserting, so re-running
    // ingest never duplicates.
    await clearVersion(source.version);
    console.log(`[${source.version}] embedding + storing ${chunks.length} chunks...`);
    const written = await embedAndStore(chunks);
    total += written;
    console.log(`[${source.version}] wrote ${written} chunks.`);
  }
  console.log(`\nDone. Wrote ${total} chunks across ${SOURCES.length} versions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

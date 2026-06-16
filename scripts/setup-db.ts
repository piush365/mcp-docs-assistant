import '../lib/load-env';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log('pgvector extension ensured.');

  // GIN index backing the lexical leg of hybrid search (full-text over content).
  await sql`CREATE INDEX IF NOT EXISTS chunks_content_fts_idx ON chunks USING gin (to_tsvector('english', content));`;
  console.log('full-text GIN index ensured.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

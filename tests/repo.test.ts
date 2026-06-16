import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { listDocFiles, type CorpusSource } from '../lib/ingest/repo';

function write(root: string, rel: string, body = 'x') {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, body);
  return abs;
}

const base = {
  repo: 'owner/repo',
  repoUrl: 'https://example/repo.git',
  gitRef: 'ref',
  urlRef: 'ref',
};

describe('listDocFiles', () => {
  it('walks nested dirs and keeps only the configured extension (spec .mdx)', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'mcp-repo-'));
    write(root, 'docs/specification/2025-11-25/server/tools.mdx');
    write(root, 'docs/specification/2025-11-25/basic/index.mdx');
    write(root, 'docs/specification/2025-11-25/server/diagram.png');

    const spec: CorpusSource = {
      ...base,
      version: '2025-11-25',
      source: 'spec',
      docsDir: 'docs/specification/2025-11-25',
      fileExts: ['.mdx'],
      includeReadme: false,
      cacheDir: root,
    };
    const files = listDocFiles(spec).map((f) => path.relative(root, f)).sort();

    expect(files).toEqual([
      'docs/specification/2025-11-25/basic/index.mdx',
      'docs/specification/2025-11-25/server/tools.mdx',
    ]);
  });

  it('includes README and flat docs/*.md but skips the documents.md TOC', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'mcp-sdk-'));
    write(root, 'README.md');
    write(root, 'docs/server.md');
    write(root, 'docs/client.md');
    write(root, 'docs/documents.md');

    const sdk: CorpusSource = {
      ...base,
      version: 'v1',
      source: 'sdk-docs',
      docsDir: 'docs',
      fileExts: ['.md'],
      includeReadme: true,
      cacheDir: root,
    };
    const files = listDocFiles(sdk).map((f) => path.basename(f)).sort();

    expect(files).toEqual(['README.md', 'client.md', 'server.md']);
  });
});

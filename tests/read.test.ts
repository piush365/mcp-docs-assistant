import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { extractTitle, blobUrl, readDocFile } from '../lib/ingest/read';
import type { CorpusSource } from '../lib/ingest/repo';

describe('extractTitle', () => {
  it('uses the first H1 when present', () => {
    expect(extractTitle('# Building Servers\n\nintro', 'server.md')).toBe('Building Servers');
  });
  it('falls back to a humanized filename when no H1', () => {
    expect(extractTitle('no heading here', 'server-quickstart.md')).toBe('server quickstart');
  });
});

describe('blobUrl', () => {
  it('builds a GitHub blob URL from the repo-relative path', () => {
    expect(blobUrl('docs/server.md', 'v1.29.0')).toBe(
      'https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.29.0/docs/server.md',
    );
  });
});

describe('readDocFile version-correctness', () => {
  it('tags chunks with the source version and pins URLs to its urlRef', () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'mcp-read-'));
    const abs = path.join(repoRoot, 'docs', 'server.md');
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, '# Registering tools\n\nUse registerTool().');

    const v2: CorpusSource = {
      version: 'v2',
      gitRef: '@modelcontextprotocol/server@2.0.0-alpha.2',
      urlRef: 'deadbeef',
      cacheDir: repoRoot,
    };
    const doc = readDocFile(abs, repoRoot, v2);

    expect(doc.version).toBe('v2');
    expect(doc.source).toBe('sdk-docs');
    expect(doc.url).toBe(
      'https://github.com/modelcontextprotocol/typescript-sdk/blob/deadbeef/docs/server.md',
    );
  });
});

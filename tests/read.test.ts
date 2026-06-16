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
  it('builds a GitHub blob URL from the repo-relative path (default repo)', () => {
    expect(blobUrl('docs/server.md', 'v1.29.0')).toBe(
      'https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.29.0/docs/server.md',
    );
  });
  it('honors an explicit repo slug (spec lives in a different repo)', () => {
    expect(
      blobUrl('docs/specification/2025-11-25/server/tools.mdx', '2025-11-25', 'modelcontextprotocol/modelcontextprotocol'),
    ).toBe(
      'https://github.com/modelcontextprotocol/modelcontextprotocol/blob/2025-11-25/docs/specification/2025-11-25/server/tools.mdx',
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
      source: 'sdk-docs',
      repo: 'modelcontextprotocol/typescript-sdk',
      repoUrl: 'https://github.com/modelcontextprotocol/typescript-sdk.git',
      gitRef: '@modelcontextprotocol/server@2.0.0-alpha.2',
      urlRef: 'deadbeef',
      docsDir: 'docs',
      fileExts: ['.md'],
      includeReadme: true,
      cacheDir: repoRoot,
    };
    const doc = readDocFile(abs, repoRoot, v2);

    expect(doc.version).toBe('v2');
    expect(doc.source).toBe('sdk-docs');
    expect(doc.url).toBe(
      'https://github.com/modelcontextprotocol/typescript-sdk/blob/deadbeef/docs/server.md',
    );
  });

  it('tags spec .mdx chunks as source=spec, pins to the spec repo, and cleans JSX', () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'mcp-spec-'));
    const abs = path.join(repoRoot, 'docs', 'specification', '2025-11-25', 'server', 'tools.mdx');
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, '---\ntitle: Tools\n---\n\n<Info>Revision 2025-11-25</Info>\n\nServers expose tools.');

    const spec: CorpusSource = {
      version: '2025-11-25',
      source: 'spec',
      repo: 'modelcontextprotocol/modelcontextprotocol',
      repoUrl: 'https://github.com/modelcontextprotocol/modelcontextprotocol.git',
      gitRef: '2025-11-25',
      urlRef: '2025-11-25',
      docsDir: 'docs/specification/2025-11-25',
      fileExts: ['.mdx'],
      includeReadme: false,
      cacheDir: repoRoot,
    };
    const doc = readDocFile(abs, repoRoot, spec);

    expect(doc.source).toBe('spec');
    expect(doc.version).toBe('2025-11-25');
    expect(doc.title).toBe('Tools'); // from frontmatter-stripped H-less file -> uses frontmatter? falls to filename
    expect(doc.markdown).not.toContain('<Info>');
    expect(doc.markdown).toContain('Servers expose tools.');
    expect(doc.url).toBe(
      'https://github.com/modelcontextprotocol/modelcontextprotocol/blob/2025-11-25/docs/specification/2025-11-25/server/tools.mdx',
    );
  });
});

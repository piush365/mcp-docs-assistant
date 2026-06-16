import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const SDK_REPO = 'https://github.com/modelcontextprotocol/typescript-sdk.git';

export interface CorpusSource {
  /** Stored on every chunk; the version-correctness differentiator. */
  version: 'v1' | 'v2';
  /** Ref passed to `git clone --branch` (tag or branch). */
  gitRef: string;
  /**
   * Ref used in GitHub blob permalinks. A commit SHA when the tag name itself
   * contains slashes (v2 tags like `@modelcontextprotocol/server@2.0.0-alpha.2`
   * would otherwise break `/blob/<ref>/<path>` parsing).
   */
  urlRef: string;
  /** Clone destination under .cache (gitignored), one per version. */
  cacheDir: string;
}

/**
 * The corpora to ingest. v1 is the stable line; v2 is the alpha rewrite
 * (split packages, `registerTool()`, Streamable HTTP). Both alpha.2 package
 * tags peel to the same monorepo commit, so we clone by the `server` tag and
 * pin URLs to that commit SHA.
 */
export const SOURCES: CorpusSource[] = [
  {
    version: 'v1',
    gitRef: 'v1.29.0', // verified via git ls-remote --tags
    urlRef: 'v1.29.0',
    cacheDir: path.resolve('.cache/mcp-sdk-v1'),
  },
  {
    version: 'v2',
    gitRef: '@modelcontextprotocol/server@2.0.0-alpha.2',
    urlRef: '00215619426d7e3e60e486cc656a4f1ca7c3c9b7', // alpha.2 monorepo commit
    cacheDir: path.resolve('.cache/mcp-sdk-v2'),
  },
];

/** Shallow-clone a corpus source into its cache dir (idempotent). Returns the repo root. */
export function cloneSdkRepo(source: CorpusSource): string {
  if (existsSync(source.cacheDir)) return source.cacheDir;
  execSync(
    `git clone --depth 1 --branch ${JSON.stringify(source.gitRef)} ${SDK_REPO} ${JSON.stringify(source.cacheDir)}`,
    { stdio: 'inherit' },
  );
  return source.cacheDir;
}

/** Absolute paths of the doc files to ingest: docs/*.md (minus the TOC) + README.md. */
export function listDocFiles(repoRoot: string): string[] {
  const docsDir = path.join(repoRoot, 'docs');
  const docs = existsSync(docsDir)
    ? readdirSync(docsDir)
        .filter((f) => f.endsWith('.md') && f !== 'documents.md') // documents.md is just a TOC
        .map((f) => path.join(docsDir, f))
    : [];
  const readme = path.join(repoRoot, 'README.md');
  return existsSync(readme) ? [readme, ...docs] : docs;
}

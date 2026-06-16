import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export interface CorpusSource {
  /** Stored on every chunk; the version-correctness differentiator. */
  version: string;
  /** Provenance tag: SDK docs vs. the protocol spec. */
  source: 'sdk-docs' | 'spec';
  /** GitHub `owner/name` used in blob permalinks. */
  repo: string;
  /** Clone URL for {@link cloneRepo}. */
  repoUrl: string;
  /** Ref passed to `git clone --branch` (tag or branch). */
  gitRef: string;
  /**
   * Ref used in GitHub blob permalinks. A commit SHA when the tag name itself
   * contains slashes (v2 tags like `@modelcontextprotocol/server@2.0.0-alpha.2`
   * would otherwise break `/blob/<ref>/<path>` parsing).
   */
  urlRef: string;
  /** Repo-relative dir to scan for docs (walked recursively). */
  docsDir: string;
  /** File extensions to ingest, e.g. ['.md'] or ['.mdx']. */
  fileExts: string[];
  /** Whether to also ingest the repo-root README. */
  includeReadme: boolean;
  /** Clone destination under .cache (gitignored), one per source. */
  cacheDir: string;
}

const SDK_REPO = 'modelcontextprotocol/typescript-sdk';
const SPEC_REPO = 'modelcontextprotocol/modelcontextprotocol';

/**
 * The corpora to ingest:
 *   - v1: stable SDK line (single package, `server.tool()`, SSE).
 *   - v2: alpha rewrite (split packages, `registerTool()`, Streamable HTTP).
 *     Both alpha.2 package tags peel to the same monorepo commit, so we clone by
 *     the `server` tag and pin URLs to that commit SHA.
 *   - spec: the protocol specification itself (revision 2025-11-25), a separate
 *     repo of Mintlify `.mdx`. Version-agnostic to the SDK — answers "what does
 *     the protocol say", complementing the SDK's "how do I code it".
 */
export const SOURCES: CorpusSource[] = [
  {
    version: 'v1',
    source: 'sdk-docs',
    repo: SDK_REPO,
    repoUrl: `https://github.com/${SDK_REPO}.git`,
    gitRef: 'v1.29.0', // verified via git ls-remote --tags
    urlRef: 'v1.29.0',
    docsDir: 'docs',
    fileExts: ['.md'],
    includeReadme: true,
    cacheDir: path.resolve('.cache/mcp-sdk-v1'),
  },
  {
    version: 'v2',
    source: 'sdk-docs',
    repo: SDK_REPO,
    repoUrl: `https://github.com/${SDK_REPO}.git`,
    gitRef: '@modelcontextprotocol/server@2.0.0-alpha.2',
    urlRef: '00215619426d7e3e60e486cc656a4f1ca7c3c9b7', // alpha.2 monorepo commit
    docsDir: 'docs',
    fileExts: ['.md'],
    includeReadme: true,
    cacheDir: path.resolve('.cache/mcp-sdk-v2'),
  },
  {
    version: '2025-11-25',
    source: 'spec',
    repo: SPEC_REPO,
    repoUrl: `https://github.com/${SPEC_REPO}.git`,
    gitRef: '2025-11-25', // latest stable protocol revision (date-tagged)
    urlRef: '2025-11-25',
    docsDir: 'docs/specification/2025-11-25',
    fileExts: ['.mdx'],
    includeReadme: false,
    cacheDir: path.resolve('.cache/mcp-spec'),
  },
];

/** Shallow-clone a corpus source into its cache dir (idempotent). Returns the repo root. */
export function cloneRepo(source: CorpusSource): string {
  if (existsSync(source.cacheDir)) return source.cacheDir;
  execSync(
    `git clone --depth 1 --branch ${JSON.stringify(source.gitRef)} ${JSON.stringify(source.repoUrl)} ${JSON.stringify(source.cacheDir)}`,
    { stdio: 'inherit' },
  );
  return source.cacheDir;
}

/** Recursively collect files under `dir` whose extension is in `exts`. */
function walk(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    if (statSync(abs).isDirectory()) {
      out.push(...walk(abs, exts));
    } else if (exts.some((e) => entry.endsWith(e)) && entry !== 'documents.md') {
      // documents.md is the SDK's TOC, not real content.
      out.push(abs);
    }
  }
  return out;
}

/** Absolute paths of the doc files to ingest for a source (README first, then docs tree). */
export function listDocFiles(source: CorpusSource): string[] {
  const docs = walk(path.join(source.cacheDir, source.docsDir), source.fileExts);
  if (!source.includeReadme) return docs;
  const readme = path.join(source.cacheDir, 'README.md');
  return existsSync(readme) ? [readme, ...docs] : docs;
}

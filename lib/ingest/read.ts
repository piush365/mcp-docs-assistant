import { readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { DocInput } from './chunk';
import type { CorpusSource } from './repo';

export function extractTitle(markdown: string, fileName: string): string {
  const h1 = markdown.split('\n').find((l) => /^#\s+/.test(l));
  if (h1) return h1.replace(/^#\s+/, '').trim();
  return fileName.replace(/\.mdx?$/, '').replace(/[-_]/g, ' ');
}

export function blobUrl(relPath: string, ref: string, repo = 'modelcontextprotocol/typescript-sdk'): string {
  return `https://github.com/${repo}/blob/${ref}/${relPath}`;
}

/** Strip a line's JSX/HTML tags, but never inside an inline `code` span. */
function stripTagsOutsideInlineCode(line: string): string {
  return line
    .split(/(`[^`]*`)/) // odd indices are inline-code spans — leave them intact
    .map((seg, i) => (i % 2 === 1 ? seg : seg.replace(/<\/?[A-Za-z][^>]*>/g, '')))
    .join('');
}

/**
 * Clean Mintlify `.mdx` down to plain markdown: drop import/export module lines
 * and JSX comments, unwrap JSX components (keep their inner text), and leave
 * fenced code blocks and inline code untouched (TS generics like `Promise<T>`
 * must survive). Collapses the blank lines that stripped wrappers leave behind.
 */
export function cleanMdx(markdown: string): string {
  const out: string[] = [];
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    if (/^\s*(import|export)\s/.test(line)) continue; // mdx module lines
    const noComments = line.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    out.push(stripTagsOutsideInlineCode(noComments));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Read a doc file into a DocInput. `repoRoot` is the clone dir; `absPath` the file. */
export function readDocFile(absPath: string, repoRoot: string, source: CorpusSource): DocInput {
  const raw = readFileSync(absPath, 'utf8');
  const { content, data } = matter(raw); // strips frontmatter; spec .mdx carries a `title`
  const isMdx = absPath.endsWith('.mdx');
  const markdown = isMdx ? cleanMdx(content) : content;
  const relPath = path.relative(repoRoot, absPath).split(path.sep).join('/');
  const fileName = path.basename(absPath);
  const frontmatterTitle = typeof data.title === 'string' ? data.title : undefined;
  // README is only ingested for SDK sources; spec sources set includeReadme=false.
  const docSource = fileName === 'README.md' ? 'readme' : source.source;
  return {
    markdown,
    title: frontmatterTitle ?? extractTitle(markdown, fileName),
    url: blobUrl(relPath, source.urlRef, source.repo),
    version: source.version,
    source: docSource,
  };
}

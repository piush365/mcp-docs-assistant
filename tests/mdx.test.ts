import { describe, it, expect } from 'vitest';
import { cleanMdx } from '../lib/ingest/read';

describe('cleanMdx', () => {
  it('unwraps JSX components but keeps their text', () => {
    expect(cleanMdx('<Info>**Protocol Revision**: 2025-11-25</Info>')).toBe(
      '**Protocol Revision**: 2025-11-25',
    );
  });

  it('drops self-closing JSX and mdx import/export lines', () => {
    const input = [
      'import { Tabs } from "x";',
      'export const meta = {};',
      '<div id="enable-section-numbers" />',
      'Real content.',
    ].join('\n');
    expect(cleanMdx(input)).toBe('Real content.');
  });

  it('leaves code fences untouched (generics look like tags)', () => {
    const input = ['```ts', 'const x: Promise<string> = f();', '```'].join('\n');
    expect(cleanMdx(input)).toBe(input);
  });

  it('preserves inline code containing angle brackets', () => {
    expect(cleanMdx('Returns `Promise<Tool>` to the caller.')).toBe(
      'Returns `Promise<Tool>` to the caller.',
    );
  });

  it('collapses the blank lines left behind by stripped tags', () => {
    const input = ['<Tabs>', '', 'Body.', '', '</Tabs>'].join('\n');
    expect(cleanMdx(input)).toBe('Body.');
  });
});

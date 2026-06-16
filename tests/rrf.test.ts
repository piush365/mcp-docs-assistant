import { describe, it, expect } from 'vitest';
import { rrfFuse } from '../lib/retrieve/rrf';

const id = (x: { id: number }) => x.id;

describe('rrfFuse', () => {
  it('ranks items appearing in both lists above items in only one', () => {
    const vector = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const lexical = [{ id: 3 }, { id: 2 }, { id: 4 }];
    // ids 2 and 3 appear in both lists -> they outrank 1 and 4 (single-list).
    const fused = rrfFuse([vector, lexical], id).map(id);
    expect(fused.slice(0, 2).sort()).toEqual([2, 3]);
    expect(fused.slice(2).sort()).toEqual([1, 4]);
  });

  it('deduplicates by key, keeping the first-seen instance', () => {
    const a = [{ id: 1, from: 'a' }];
    const b = [{ id: 1, from: 'b' }];
    const fused = rrfFuse([a, b], (x) => x.id);
    expect(fused).toHaveLength(1);
    expect(fused[0].from).toBe('a');
  });

  it('returns a single list unchanged in order', () => {
    const only = [{ id: 9 }, { id: 8 }, { id: 7 }];
    expect(rrfFuse([only], id).map(id)).toEqual([9, 8, 7]);
  });

  it('handles empty inputs', () => {
    expect(rrfFuse<{ id: number }>([], id)).toEqual([]);
    expect(rrfFuse([[], []], id)).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { hasConfidentMatch, detectVersion, CONFIDENCE_THRESHOLD } from '../lib/agent/gate';

describe('hasConfidentMatch', () => {
  it('returns false when there are no results', () => {
    expect(hasConfidentMatch([])).toBe(false);
  });
  it('returns false when every chunk is below the confidence bar', () => {
    expect(hasConfidentMatch([{ similarity: 0.2 }, { similarity: 0.39 }])).toBe(false);
  });
  it('returns true when at least one chunk clears the bar', () => {
    expect(hasConfidentMatch([{ similarity: 0.1 }, { similarity: CONFIDENCE_THRESHOLD }])).toBe(true);
  });
});

describe('detectVersion', () => {
  it('detects an explicit v2 mention', () => {
    expect(detectVersion('how do I do this in v2?')).toBe('v2');
  });
  it('detects v2 from new-API signals', () => {
    expect(detectVersion('how do I use registerTool?')).toBe('v2');
    expect(detectVersion('setting up Streamable HTTP transport')).toBe('v2');
  });
  it('detects v1 from legacy-API signals', () => {
    expect(detectVersion('how do I use server.tool() with SSE?')).toBe('v1');
  });
  it('returns undefined when no version is pinned', () => {
    expect(detectVersion('how do I register a tool?')).toBeUndefined();
  });
});

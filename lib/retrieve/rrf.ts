/**
 * Reciprocal Rank Fusion — combine several ranked lists into one without needing
 * comparable scores between them. Each list contributes 1/(k + rank) per item;
 * items are summed across lists and re-sorted. This is how we merge the semantic
 * (vector) and lexical (full-text) rankings into a single hybrid order, and it
 * doubles as the rerank step (no separate reranker model needed).
 *
 * Pure + DB-free so it unit-tests without credentials. k=60 is the standard
 * dampening constant from the original RRF paper.
 */
export const RRF_K = 60;

export function rrfFuse<T>(
  rankings: ReadonlyArray<ReadonlyArray<T>>,
  keyOf: (item: T) => string | number,
  k: number = RRF_K,
): T[] {
  const scores = new Map<string | number, number>();
  const firstSeen = new Map<string | number, T>();

  for (const list of rankings) {
    list.forEach((item, index) => {
      const key = keyOf(item);
      scores.set(key, (scores.get(key) ?? 0) + 1 / (k + index + 1));
      if (!firstSeen.has(key)) firstSeen.set(key, item);
    });
  }

  return [...firstSeen.keys()]
    .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0))
    .map((key) => firstSeen.get(key)!);
}

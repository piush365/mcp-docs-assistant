/**
 * Retrieval gate — pure logic deciding whether retrieved docs are good enough to
 * answer from, and which SDK version the user is asking about. Kept free of DB /
 * model imports so it unit-tests without credentials.
 *
 * This is the refusal moat: the model only answers when the gate says the docs
 * actually cover the question. No confident match → the agent refuses instead of
 * guessing.
 */

export type SdkVersion = 'v1' | 'v2';

/** Min cosine similarity for a chunk to count as a real, citable match. */
export const CONFIDENCE_THRESHOLD = 0.45;

/** True when at least one retrieved chunk clears the confidence bar. */
export function hasConfidentMatch(
  results: ReadonlyArray<{ similarity: number }>,
  threshold = CONFIDENCE_THRESHOLD,
): boolean {
  return results.some((r) => r.similarity >= threshold);
}

/**
 * Detect an explicit SDK version in the query so retrieval can be scoped.
 * Returns undefined when the user didn't pin a version (the agent then answers
 * across both and disambiguates).
 */
export function detectVersion(query: string): SdkVersion | undefined {
  const q = query.toLowerCase();
  // v2 signals: "v2", "2.0", "alpha", new split-package / API names.
  if (/\bv2\b|\b2\.0\b|\balpha\b|registertool|streamable\s*http/.test(q)) {
    return 'v2';
  }
  // v1 signals: "v1", "1.x", legacy API names.
  if (/\bv1\b|\b1\.\d|server\.tool\b|\bsse\b/.test(q)) {
    return 'v1';
  }
  return undefined;
}

import { generateText, stepCountIs } from 'ai';
import { chatModel } from './model';
import { SYSTEM_PROMPT } from './prompt';
import { searchDocs } from './tools';

/** Max agent steps: enough for search → (optional refine) → answer, bounded so it can't loop. */
export const MAX_STEPS = 5;

export interface AnswerResult {
  text: string;
  steps: number;
}

/**
 * Agentic answer loop: the model calls {@link searchDocs} (possibly more than
 * once, e.g. once per version), then writes a cited, version-correct answer —
 * or refuses when the tool reports no relevant docs.
 */
export async function answer(question: string): Promise<AnswerResult> {
  const result = await generateText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    prompt: question,
    tools: { searchDocs },
    stopWhen: stepCountIs(MAX_STEPS),
  });
  return { text: result.text, steps: result.steps.length };
}

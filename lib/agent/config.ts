import { stepCountIs } from 'ai';
import { chatModel } from './model';
import { SYSTEM_PROMPT } from './prompt';
import { searchDocs } from './tools';

/** Max agent steps: enough for search → (optional refine) → answer, bounded so it can't loop. */
export const MAX_STEPS = 5;

/**
 * One source of truth for the agent's wiring, shared by the CLI (`generateText`
 * in answer.ts) and the chat route (`streamText`). Keeping model + system prompt
 * + tools + stop condition together means the terminal and the browser behave
 * identically.
 *
 * `experimental_telemetry` emits OpenTelemetry spans for every generation +
 * tool call. It's a no-op until an exporter is registered, and gated on
 * Langfuse keys so it only activates in environments wired for tracing
 * (see DEPLOY.md → Observability).
 */
export const agentConfig = {
  model: chatModel,
  system: SYSTEM_PROMPT,
  tools: { searchDocs },
  stopWhen: stepCountIs(MAX_STEPS),
  experimental_telemetry: {
    isEnabled: Boolean(process.env.LANGFUSE_PUBLIC_KEY),
    functionId: 'mcp-doc-assistant',
  },
} as const;

import { google } from '@ai-sdk/google';

/**
 * Chat model for the agentic answer loop. Gemini 2.5 Flash — fast, cheap, strong
 * tool-calling, same provider/key as the embedding model
 * (`GOOGLE_GENERATIVE_AI_API_KEY`).
 */
export const chatModel = google('gemini-2.5-flash');

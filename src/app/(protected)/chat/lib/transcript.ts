export const CLARIFY_PREFIX = '[You asked the user to clarify]:';

export interface TranscriptSource {
  role: 'user' | 'assistant';
  content?: string;
  clarify?: string;
  isStreaming?: boolean;
}

/**
 * Builds the wire transcript sent to the server. Assistant clarify-only messages
 * (content unset) are serialized with CLARIFY_PREFIX so the model can see what it
 * asked; the server prompt keys off that exact prefix.
 */
export function buildTranscript(
  messages: TranscriptSource[],
): { role: string; content: string }[] {
  return messages
    .filter((m) => !m.isStreaming)
    .map((m) => ({
      role: m.role,
      content: m.content ?? (m.clarify ? `${CLARIFY_PREFIX} ${m.clarify}` : ''),
    }))
    .filter((m) => m.content.trim().length > 0);
}

export interface SseEvent {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export interface SseParser {
  /** Feed the next decoded chunk; returns every complete event it finished. */
  feed(chunk: string): SseEvent[];
}

/**
 * Incremental parser for the chat stream: `event:` names the next `data:` line, a blank line resets
 * the name to `message`, `:` lines are heartbeats, and data that is not JSON is skipped.
 */
export function createSseParser(): SseParser {
  let buffer = '';
  let eventName = 'message';

  return {
    feed(chunk: string): SseEvent[] {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      const events: SseEvent[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          eventName = 'message';
          continue;
        }
        if (trimmed.startsWith(':')) continue;
        if (trimmed.startsWith('event:')) {
          eventName = trimmed.substring(6).trim();
          continue;
        }
        if (trimmed.startsWith('data:')) {
          try {
            events.push({ event: eventName, data: JSON.parse(trimmed.substring(5).trim()) });
          } catch {
            // A malformed data line is dropped; the stream carries on.
          }
        }
      }
      return events;
    },
  };
}

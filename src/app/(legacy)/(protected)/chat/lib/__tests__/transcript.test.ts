import { describe, expect, it } from 'vitest';

import {
  buildTranscript,
  CLARIFY_PREFIX,
  TranscriptSource,
} from '../transcript';

describe('buildTranscript', () => {
  it('passes user and answered-assistant messages through unchanged', () => {
    const messages: TranscriptSource[] = [
      { role: 'user', content: 'What was my spend last month?' },
      { role: 'assistant', content: 'You spent ₹45,000 last month.' },
      { role: 'user', content: 'Break it down by category.' },
    ];

    const result = buildTranscript(messages);

    expect(result).toEqual([
      { role: 'user', content: 'What was my spend last month?' },
      { role: 'assistant', content: 'You spent ₹45,000 last month.' },
      { role: 'user', content: 'Break it down by category.' },
    ]);
  });

  it('serializes clarify-only assistant messages with CLARIFY_PREFIX', () => {
    const messages: TranscriptSource[] = [
      { role: 'user', content: 'Show transactions for my card' },
      { role: 'assistant', clarify: 'Which card did you mean?' },
      { role: 'user', content: 'HDFC Infinia' },
    ];

    const result = buildTranscript(messages);

    expect(result).toEqual([
      { role: 'user', content: 'Show transactions for my card' },
      {
        role: 'assistant',
        content: `${CLARIFY_PREFIX} Which card did you mean?`,
      },
      { role: 'user', content: 'HDFC Infinia' },
    ]);
  });

  it('excludes streaming placeholder messages', () => {
    const messages: TranscriptSource[] = [
      { role: 'user', content: 'Show net worth' },
      { role: 'assistant', isStreaming: true, content: 'Thinking…' },
    ];

    const result = buildTranscript(messages);

    expect(result).toEqual([
      { role: 'user', content: 'Show net worth' },
    ]);
  });

  it('excludes error-only messages with no content and no clarify', () => {
    const messages: TranscriptSource[] = [
      { role: 'user', content: 'Show spend' },
      { role: 'assistant' }, // no content, no clarify
    ];

    const result = buildTranscript(messages);

    expect(result).toEqual([
      { role: 'user', content: 'Show spend' },
    ]);
  });

  it('keeps content when a message has both content and clarify', () => {
    const messages: TranscriptSource[] = [
      {
        role: 'assistant',
        content: 'Here is the summary',
        clarify: 'Should I filter by date?',
      },
    ];

    const result = buildTranscript(messages);

    expect(result).toEqual([
      { role: 'assistant', content: 'Here is the summary' },
    ]);
  });
});

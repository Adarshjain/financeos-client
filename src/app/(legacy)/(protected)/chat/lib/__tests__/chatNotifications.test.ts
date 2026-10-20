import { afterEach, describe, expect, it, vi } from 'vitest';

import * as browserNotifications from '@/lib/browserNotifications';

import { buildChatNotification, notifyChatComplete } from '../chatNotifications';

describe('buildChatNotification', () => {
  it('prefers the error over answer and clarify', () => {
    const result = buildChatNotification({
      answer: 'Some answer',
      clarify: 'Some question',
      error: 'Boom',
    });
    expect(result).toEqual({ title: 'Chat failed', body: 'Boom' });
  });

  it('uses the clarify question when there is no error', () => {
    const result = buildChatNotification({
      answer: 'Some answer',
      clarify: 'Which card did you mean?',
    });
    expect(result).toEqual({
      title: 'Chat needs your input',
      body: 'Which card did you mean?',
    });
  });

  it('strips markdown from the answer body', () => {
    const result = buildChatNotification({
      answer: '## Summary\nYou spent **₹45,000** on `dining` — [details](/x).',
    });
    expect(result.title).toBe('Your answer is ready');
    expect(result.body).toBe('Summary You spent ₹45,000 on dining — details.');
  });

  it('truncates long bodies to a preview', () => {
    const result = buildChatNotification({ answer: 'a'.repeat(500) });
    expect(result.body.length).toBeLessThanOrEqual(140);
    expect(result.body.endsWith('…')).toBe(true);
  });

  it('falls back to a generic body when the answer is empty', () => {
    const result = buildChatNotification({});
    expect(result.body).toBe('Open the chat to see the result.');
  });
});

describe('notifyChatComplete', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates to notifyWhenAway with the built content and chat tag', () => {
    const notifyWhenAway = vi
      .spyOn(browserNotifications, 'notifyWhenAway')
      .mockImplementation(() => undefined);

    notifyChatComplete({ answer: 'Done!' });

    expect(notifyWhenAway).toHaveBeenCalledWith({
      title: 'Your answer is ready',
      body: 'Done!',
      tag: 'financeos-chat',
    });
  });
});

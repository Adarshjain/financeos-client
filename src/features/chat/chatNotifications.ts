/**
 * Chat-specific wrapper over the shared browser-notification helpers: when a
 * chat response finishes (answer, clarifying question, or error) while the
 * user is not looking at the page, a notification is shown.
 */

import {
  markdownToPlainText,
  notifyWhenAway,
  truncateForNotification,
} from '@/lib/browserNotifications';

export interface ChatOutcome {
  answer?: string;
  clarify?: string;
  error?: string;
}

const NOTIFICATION_TAG = 'financeos-chat';

/** Pure: build the notification title/body for a finished chat turn. */
export function buildChatNotification(outcome: ChatOutcome): {
  title: string;
  body: string;
} {
  if (outcome.error) {
    return {
      title: 'Chat failed',
      body: truncateForNotification(markdownToPlainText(outcome.error)),
    };
  }
  if (outcome.clarify) {
    return {
      title: 'Chat needs your input',
      body: truncateForNotification(markdownToPlainText(outcome.clarify)),
    };
  }
  const body = outcome.answer
    ? truncateForNotification(markdownToPlainText(outcome.answer))
    : '';
  return {
    title: 'Your answer is ready',
    body: body || 'Open the chat to see the result.',
  };
}

/**
 * Show a completion notification, but only when permission is granted and the
 * user is not currently looking at the page.
 */
export function notifyChatComplete(outcome: ChatOutcome): void {
  notifyWhenAway({ ...buildChatNotification(outcome), tag: NOTIFICATION_TAG });
}

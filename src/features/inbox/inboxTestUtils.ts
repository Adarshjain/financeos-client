import type { InboxActionResponse, InboxItemResponse, InboxResponse } from '@/lib/api/types';

export function action(over: Partial<InboxActionResponse> & { type: string }): InboxActionResponse {
  return { label: over.type, ...over } as InboxActionResponse;
}

export function item(over: Partial<InboxItemResponse> & { key: string }): InboxItemResponse {
  return {
    kind: 'bill',
    rowType: 'item',
    section: 'act_now',
    severity: 'warning',
    title: `Title ${over.key}`,
    actions: [],
    refs: {},
    ...over,
  } as InboxItemResponse;
}

export const SNOOZE = action({ type: 'snooze', label: 'Snooze' });
export const DISMISS = action({ type: 'dismiss', label: 'Dismiss' });

export function inbox(items: InboxItemResponse[]): InboxResponse {
  const count = (section: string) => items.filter((i) => i.section === section).length;
  return {
    generatedAt: '2026-10-08T00:00:00Z',
    items,
    summary: {
      actNow: count('act_now'),
      needsLook: count('needs_look'),
      info: count('info'),
      badge: count('act_now') + count('needs_look'),
    },
  };
}

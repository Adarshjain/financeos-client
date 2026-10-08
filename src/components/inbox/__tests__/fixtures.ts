import type { InboxActionResponse, InboxItemResponse } from '@/lib/api/types';

export function action(over: Partial<InboxActionResponse> & { type: string }): InboxActionResponse {
  return { label: over.type, ...over } as InboxActionResponse;
}

export function item(over: Partial<InboxItemResponse> & { key: string }): InboxItemResponse {
  return {
    kind: 'card_bill',
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

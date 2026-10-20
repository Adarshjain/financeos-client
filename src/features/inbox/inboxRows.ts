import type { InboxActionResponse, InboxItemResponse } from '@/lib/api/types';

import {
  actionHref,
  type BillActionType,
  type InboxSectionKey,
  isBillAction,
  primaryActions,
} from './inbox.helpers';
import { toPendingBillAction } from './inboxBillAction';

export const INBOX_SECTION_TITLES: Record<InboxSectionKey, string> = {
  act_now: 'Act now',
  needs_look: 'Needs a look',
  info: 'Updates',
};

/** One decision button on a row: it links somewhere, or opens a bill dialog. */
export interface RowButton {
  id: string;
  label: string;
  /** `secondary` for the row's doing action (Upload, Mark paid, Reconnect), `link` for the rest. */
  variant: 'secondary' | 'link';
  href?: string;
  bill?: BillActionType;
  disabled?: boolean;
}

const DOING = new Set(['mark_paid', 'upload', 'reconnect']);

function destination(item: InboxItemResponse, action: InboxActionResponse): Pick<RowButton, 'label' | 'href'> {
  const href = actionHref(action, item) ?? undefined;
  switch (item.kind) {
    case 'gmail_attention':
      return { label: 'Assign', href: '/ds/settings/connections' };
    case 'job':
      return {
        label: item.section === 'info' ? 'Details' : 'View',
        href: item.refs.jobId ? `/ds/settings/activity?job=${item.refs.jobId}` : href,
      };
    case 'reward_milestone':
    case 'reward_cap':
      return {
        label: 'Rewards',
        href: item.refs.accountId ? `/ds/accounts/${item.refs.accountId}/rewards` : href,
      };
    case 'emi':
    case 'lending':
      return { label: 'Open', href };
    case 'review':
      return { label: 'Review', href };
    default:
      return { label: action.label, href };
  }
}

/** The row's buttons from the server's actions (snooze and dismiss are separate); a summary row shows one. */
export function rowButtons(item: InboxItemResponse): RowButton[] {
  const actions = primaryActions(item).slice(0, item.rowType === 'summary' ? 1 : undefined);
  const buttons: RowButton[] = [];
  actions.forEach((action, index) => {
    const id = `${action.type}-${index}`;
    const variant = DOING.has(action.type) ? 'secondary' : 'link';
    if (isBillAction(action.type)) {
      buttons.push({
        id,
        label: action.type === 'set_details' ? 'Set details' : action.label,
        variant,
        bill: action.type,
        disabled: toPendingBillAction(item, action) === null,
      });
      return;
    }
    if (item.kind === 'statement_details_missing' && item.refs.statementId) {
      buttons.push({ id, label: 'Set details', variant: 'link', bill: 'set_details' });
      return;
    }
    const { label, href } = destination(item, action);
    if (!href) return;
    buttons.push({ id, label, variant, href });
  });
  return buttons;
}

/** What a bill button opens: the row's statement, whichever action carried it. */
export function pendingFor(item: InboxItemResponse, button: RowButton) {
  if (!button.bill) return null;
  const action = item.actions.find((a) => a.type === button.bill);
  if (action) return toPendingBillAction(item, action);
  return item.refs.statementId ? { type: button.bill, statementId: item.refs.statementId } : null;
}

import { appHref } from '@/features/shell/routes';
import type { InboxActionResponse, InboxItemResponse } from '@/lib/api/types';

import { toPendingBillAction } from './inboxBillActions';
import {
  actionHref,
  type BillActionType,
  type InboxSectionKey,
  isBillAction,
  primaryActions,
} from './inboxModel';

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
  /** An EPF suggestion's own buttons: attach the credit, or say it is not this one. */
  epf?: 'link' | 'dismiss';
  /** A link_suggestion row: opens the review dialog for this suggestion kind. */
  suggestions?: LinkSuggestionKind;
  disabled?: boolean;
}

export type LinkSuggestionKind = 'TRANSFER' | 'CC_PAYMENT' | 'REFUND';
const LINK_SUGGESTION_KEY = 'link-suggestion:';

/** The suggestion kind a link_suggestion row stands for (its key is `link-suggestion:<KIND>`), or null. */
export function suggestionKindOf(item: InboxItemResponse): LinkSuggestionKind | null {
  if (item.kind !== 'link_suggestion' || !item.key.startsWith(LINK_SUGGESTION_KEY)) return null;
  const kind = item.key.slice(LINK_SUGGESTION_KEY.length);
  return kind === 'TRANSFER' || kind === 'CC_PAYMENT' || kind === 'REFUND' ? kind : null;
}

const DOING = new Set(['mark_paid', 'upload', 'reconnect']);

function destination(item: InboxItemResponse, action: InboxActionResponse): Pick<RowButton, 'label' | 'href'> {
  const raw = actionHref(action, item);
  const href = raw ? appHref(raw) : undefined;
  switch (item.kind) {
    case 'gmail_attention':
      return { label: 'Assign', href: appHref('/settings/connections') };
    case 'job':
      return {
        label: item.section === 'info' ? 'Details' : 'View',
        href: item.refs.jobId ? appHref(`/settings/activity?job=${item.refs.jobId}`) : href,
      };
    case 'reward_milestone':
    case 'reward_cap':
      return {
        label: 'Rewards',
        href: item.refs.accountId ? appHref(`/accounts/${item.refs.accountId}/rewards`) : href,
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

/** "Not this one" then "Link": the suggestion needs both a credit and a withdrawal to act on. */
function epfButtons(item: InboxItemResponse): RowButton[] {
  const ready = Boolean(item.refs.epfEntryId && item.refs.transactionId);
  const buttons: RowButton[] = [];
  if (item.actions.some((a) => a.type === 'dismiss')) {
    buttons.push({ id: 'epf_dismiss', label: 'Not this one', variant: 'link', epf: 'dismiss', disabled: !ready });
  }
  if (item.actions.some((a) => a.type === 'epf_link')) {
    buttons.push({ id: 'epf_link', label: 'Link', variant: 'secondary', epf: 'link', disabled: !ready });
  }
  return buttons;
}

/** The row's buttons from the server's actions (snooze and dismiss are separate); a summary row shows one. */
export function rowButtons(item: InboxItemResponse): RowButton[] {
  if (item.kind === 'epf_match') return epfButtons(item);
  if (item.kind === 'link_suggestion') {
    const suggestions = suggestionKindOf(item);
    return suggestions ? [{ id: 'link_suggestion', label: 'Review', variant: 'link', suggestions }] : [];
  }
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

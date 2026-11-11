import { holdingHref } from '@/features/investments/investmentsTabs';
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

/** A corporate-action row's own buttons: take back an automatic one, review or turn down a pending one, record a stock that stopped trading. */
export type CorporateActionRowAction = 'undo' | 'review' | 'not_applicable' | 'merged' | 'delisted';

export type NpsRowAction = 'add_self' | 'add_child' | 'ignore' | 'link' | 'dismiss' | 'record' | 'record_I' | 'record_II' | 'not_nps' | 'setup_not_nps';

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
  /** An NPS row's own buttons: Gmail (mine / my child's / ignore), a payment pairing (link / not this one), or a debit to record. */
  nps?: NpsRowAction;
  /** A detected corporate action's own buttons. */
  ca?: CorporateActionRowAction;
  disabled?: boolean;
}

/** A row's "More options" menu item: "No statement this period", with the card and period end to mark. */
export interface RowMenuAction {
  id: string;
  label: string;
  skip?: { accountId: string; periodEnd: string };
  /** An NPS row's menu action (Ignore on a new Gmail account, Not NPS beside the two tier buttons). */
  nps?: NpsRowAction;
}

/** What the NPS rows need from outside the row: whether Tier II is open on the account a debit would be recorded to. */
export interface RowOptions {
  npsTier2?: boolean;
  /** The recording target is still loading: Record and the tier buttons wait for it. */
  npsTargetLoading?: boolean;
}

/** The server's action type for marking a card's cycle as having no statement. */
export const NO_STATEMENT = 'no_statement';

const DOING = new Set(['mark_paid', 'upload', 'reconnect']);

function destination(item: InboxItemResponse, action: InboxActionResponse): Pick<RowButton, 'label' | 'href'> {
  const raw = actionHref(action, item);
  const href = raw ? appHref(raw) : undefined;
  switch (item.kind) {
    case 'gmail_attention':
      return { label: 'Assign', href: appHref('/data-sources/connections') };
    case 'job':
      return {
        label: 'View',
        href: item.refs.jobId ? appHref(`/data-sources/sync?job=${item.refs.jobId}`) : href,
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
    case 'holding_oversold':
      return { label: action.label, href: item.refs.instrumentId ? holdingHref(item.refs.instrumentId) : href };
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

const NPS_PENDING_BUTTONS: Record<string, { label: string; variant: RowButton['variant']; nps: NonNullable<RowButton['nps']> }> = {
  nps_add_self: { label: 'Mine', variant: 'secondary', nps: 'add_self' },
  nps_add_child: { label: "My child's", variant: 'link', nps: 'add_child' },
  nps_ignore: { label: 'Ignore', variant: 'link', nps: 'ignore' },
};

/**
 * Gmail found an NPS statement it can't open (password: the NPS tab takes it) or an account it doesn't know
 * (add as mine / my child's / ignore, straight from the row).
 */
function npsPendingButtons(item: InboxItemResponse): RowButton[] {
  const ready = Boolean(item.refs.npsPendingId);
  const buttons: RowButton[] = [];
  for (const action of item.actions) {
    if (action.type === 'nps_password') {
      buttons.push({ id: action.type, label: 'Enter password', variant: 'secondary', href: appHref(actionHref(action, item) ?? '/investments/nps') });
      continue;
    }
    const known = NPS_PENDING_BUTTONS[action.type];
    // On a new account the long "Ignore" lives in the row's menu, so the row keeps two short buttons.
    if (known && !(item.kind === 'nps_new_account' && action.type === 'nps_ignore')) buttons.push({ id: action.type, ...known, disabled: !ready });
  }
  return buttons;
}

/** "Looks like you invest in NPS": one inline "Set up" (the row's open action); "Not NPS" lives in the menu. */
function npsSetupButtons(item: InboxItemResponse): RowButton[] {
  const open = item.actions.find((a) => a.type === 'open');
  return open ? [{ id: 'nps_setup', label: 'Set up', variant: 'secondary', href: appHref(actionHref(open, item) ?? '/investments/nps') }] : [];
}

/** "Link" / "Not this one" for a contribution that fits a payment but not uniquely. */
function npsMatchButtons(item: InboxItemResponse): RowButton[] {
  const ready = Boolean(item.refs.npsEntryId && item.refs.transactionId);
  const buttons: RowButton[] = [];
  if (item.actions.some((a) => a.type === 'nps_link')) {
    buttons.push({ id: 'nps_link', label: 'Link', variant: 'secondary', nps: 'link', disabled: !ready });
  }
  if (item.actions.some((a) => a.type === 'nps_dismiss')) {
    buttons.push({ id: 'nps_dismiss', label: 'Not this one', variant: 'link', nps: 'dismiss', disabled: !ready });
  }
  return buttons;
}

/**
 * A debit that looks like an NPS payment: "Record" and "Not NPS", or with Tier II open "Tier I" and "Tier II"
 * (Not NPS then goes in the row's menu: two inline buttons at most).
 */
function npsRecordButtons(item: InboxItemResponse, options: RowOptions): RowButton[] {
  const ready = Boolean(item.refs.transactionId);
  const recordReady = ready && !options.npsTargetLoading;
  const buttons: RowButton[] = [];
  if (item.actions.some((a) => a.type === 'nps_record')) {
    if (options.npsTier2) {
      buttons.push({ id: 'nps_record_I', label: 'Tier I', variant: 'secondary', nps: 'record_I', disabled: !recordReady });
      buttons.push({ id: 'nps_record_II', label: 'Tier II', variant: 'link', nps: 'record_II', disabled: !recordReady });
    } else {
      buttons.push({ id: 'nps_record', label: 'Record', variant: 'secondary', nps: 'record', disabled: !recordReady });
    }
  }
  if (!options.npsTier2 && item.actions.some((a) => a.type === 'nps_not_nps')) {
    buttons.push({ id: 'nps_not_nps', label: 'Not NPS', variant: 'link', nps: 'not_nps', disabled: !ready });
  }
  return buttons;
}

/** Detected corporate actions: Undo an applied one; Review / Ignore on a pending one; Merged / Delisted on a stock that stopped trading. */
function corporateActionButtons(item: InboxItemResponse): RowButton[] {
  if (item.kind === 'corporate_action_applied') {
    return [{ id: 'ca_undo', label: 'Undo', variant: 'secondary', ca: 'undo', disabled: !item.refs.suggestionId }];
  }
  if (item.kind === 'corporate_action_review') {
    const ready = Boolean(item.refs.suggestionId);
    return [
      { id: 'ca_review', label: 'Review', variant: 'secondary', ca: 'review', disabled: !ready },
      { id: 'ca_not_applicable', label: 'Ignore', variant: 'link', ca: 'not_applicable', disabled: !ready },
    ];
  }
  const ready = Boolean(item.refs.instrumentId);
  return [
    { id: 'ca_merged', label: 'Merged', variant: 'secondary', ca: 'merged', disabled: !ready },
    { id: 'ca_delisted', label: 'Delisted', variant: 'link', ca: 'delisted', disabled: !ready },
  ];
}

/** The row's buttons from the server's actions (snooze and dismiss are separate); a summary row shows one. */
export function rowButtons(item: InboxItemResponse, options: RowOptions = {}): RowButton[] {
  if (item.kind === 'corporate_action_applied' || item.kind === 'corporate_action_review' || item.kind === 'stock_not_trading') {
    return corporateActionButtons(item);
  }
  if (item.kind === 'epf_match') return epfButtons(item);
  if (item.kind === 'nps_match') return npsMatchButtons(item);
  if (item.kind === 'nps_setup') return npsSetupButtons(item);
  if (item.kind === 'nps_record') return npsRecordButtons(item, options);
  if (item.kind === 'nps_password' || item.kind === 'nps_new_account') return npsPendingButtons(item);
  const actions = primaryActions(item)
    .filter((a) => a.type !== NO_STATEMENT)
    .slice(0, item.rowType === 'summary' ? 1 : undefined);
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

/** The row's menu actions: "No statement this period" (left out when the server names no card or period end). */
export function rowMenuActions(item: InboxItemResponse, options: RowOptions = {}): RowMenuAction[] {
  const actions: RowMenuAction[] = [];
  if (item.kind === 'nps_new_account' && item.actions.some((a) => a.type === 'nps_ignore')) {
    actions.push({ id: 'nps_ignore', label: 'Ignore', nps: 'ignore' });
  }
  if (item.kind === 'nps_setup' && item.actions.some((a) => a.type === 'nps_setup_not_nps')) {
    actions.push({ id: 'nps_setup_not_nps', label: 'Not NPS', nps: 'setup_not_nps' });
  }
  if (item.kind === 'nps_record' && options.npsTier2 && item.actions.some((a) => a.type === 'nps_not_nps')) {
    actions.push({ id: 'nps_not_nps', label: 'Not NPS', nps: 'not_nps' });
  }
  primaryActions(item).forEach((action, index) => {
    if (action.type !== NO_STATEMENT) return;
    const accountId = action.payload?.accountId ?? item.refs.accountId;
    const periodEnd = action.payload?.date ?? item.date;
    if (!accountId || !periodEnd) return;
    actions.push({ id: `${action.type}-${index}`, label: action.label, skip: { accountId, periodEnd } });
  });
  return actions;
}

/** What a bill button opens: the row's statement, whichever action carried it. */
export function pendingFor(item: InboxItemResponse, button: RowButton) {
  if (!button.bill) return null;
  const action = item.actions.find((a) => a.type === button.bill);
  if (action) return toPendingBillAction(item, action);
  return item.refs.statementId ? { type: button.bill, statementId: item.refs.statementId } : null;
}

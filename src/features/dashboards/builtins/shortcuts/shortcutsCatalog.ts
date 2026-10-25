// What a shortcut can point at, and how a stored shortcut id resolves (no icons: Dinero tiles are labelled buttons).
//
// Ids (the shortcuts widget's `items` param, an ordered list):
//   page:/path        a page from SHORTCUT_PAGES
//   action:<id>       a shortcut action
//   account:<uuid>    one account's page
//   report:<uuid>     one saved report
//   dashboard:<uuid>  one dashboard
// An id that is malformed, names an unknown page/action, or an account / report / dashboard the user no longer
// has resolves to null (hidden). The Legacy catalog and actions import all of this and only add their icons.

import { useMemo } from 'react';

import type { Account } from '@/lib/account.types';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useDashboards } from '@/lib/query/hooks/useDashboards';
import { useReportsList } from '@/lib/query/hooks/useReports';
import type { ReportSummaryResponse } from '@/lib/reports.types';

export type ShortcutKind = 'page' | 'action' | 'account' | 'report' | 'dashboard';

/** The shortcuts a new widget starts with. */
export const DEFAULT_SHORTCUTS: readonly string[] = [
  'action:add-transaction',
  'page:/transactions/review',
  'page:/transactions/import',
  'page:/upcoming',
];

/** The server's item pattern for the `items` param. */
export const SHORTCUT_ID_PATTERN = /^(page|action|account|report|dashboard):[A-Za-z0-9/_\-.:?=&]{1,200}$/;

/** Splits an id into kind and value; null when it does not match the item pattern. */
export function parseShortcutId(id: string): { kind: ShortcutKind; value: string } | null {
  if (!SHORTCUT_ID_PATTERN.test(id)) return null;
  const at = id.indexOf(':');
  return { kind: id.slice(0, at) as ShortcutKind, value: id.slice(at + 1) };
}

export type DialogActionId = 'add-transaction' | 'record-lending';

export interface ShortcutItem {
  /** The canonical id, as stored. */
  id: string;
  kind: ShortcutKind;
  label: string;
  /** Legacy-shaped path the tile navigates to (the widget passes it through appHref); null for a dialog action. */
  href: string | null;
  /** The dialog the tile opens; null when it navigates. */
  actionId: DialogActionId | null;
}

/**
 * Every page a shortcut can point at, with its label, in navigation order. The one list: the Legacy shortcuts
 * catalog reads it too. Hrefs are Legacy-shaped; the tile passes them through appHref, so a page already built in
 * Dinero opens its /ds page and the rest open their current route.
 */
export const SHORTCUT_PAGES: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/dashboard', label: 'Home' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/upcoming', label: 'Upcoming' },
  { href: '/chat', label: 'Chat with Data' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/transactions/review', label: 'Needs Review' },
  { href: '/transactions/import', label: 'Import' },
  { href: '/dashboards', label: 'Dashboards' },
  { href: '/reports', label: 'Reports' },
  { href: '/rules', label: 'Rules' },
  { href: '/rules/categories', label: 'Category Manager' },
  { href: '/rewards', label: 'Rewards' },
  { href: '/rewards/rules', label: 'Earning rules' },
  { href: '/rewards/recommend', label: 'Card Picker' },
  { href: '/investments', label: 'Holdings' },
  { href: '/investments/tradebook', label: 'Tradebook' },
  { href: '/investments/dividends', label: 'Dividends' },
  { href: '/investments/instruments', label: 'Instruments' },
  { href: '/investments/corporate-actions', label: 'Corporate Actions' },
  { href: '/investments/fno', label: 'FnO' },
  { href: '/loans', label: 'Loans' },
  { href: '/loans/lendings', label: 'Lendings' },
  { href: '/settings', label: 'Settings' },
];
const PAGES = SHORTCUT_PAGES;

export type PageActionId = 'import-statement' | 'ask-chat' | 'review-queue';
export type ActionId = DialogActionId | PageActionId;

/** The shortcut actions, UI-agnostic: a dialog the tile opens or a page it links to. The Legacy actions add icons and loaders. */
export type ShortcutActionDef = { id: DialogActionId; label: string; dialog: DialogActionId } | { id: PageActionId; label: string; href: string };

export const SHORTCUT_ACTION_DEFS: Readonly<Record<ActionId, ShortcutActionDef>> = {
  'add-transaction': { id: 'add-transaction', label: 'Add transaction', dialog: 'add-transaction' },
  'record-lending': { id: 'record-lending', label: 'Record lending', dialog: 'record-lending' },
  'import-statement': { id: 'import-statement', label: 'Import statement', href: '/transactions/import' },
  'ask-chat': { id: 'ask-chat', label: 'Ask chat', href: '/chat' },
  'review-queue': { id: 'review-queue', label: 'Review queue', href: '/transactions/review' },
};
const ACTIONS = SHORTCUT_ACTION_DEFS as Readonly<Record<string, ShortcutActionDef>>;

/** The user's things a shortcut can name; a list still loading is undefined. */
export interface ShortcutEntities {
  accounts?: Account[];
  reports?: ReportSummaryResponse[];
  dashboards?: DashboardResponse[];
}

const link = (id: string, kind: ShortcutKind, label: string, href: string): ShortcutItem => ({
  id, kind, label, href, actionId: null,
});

/** One stored id as a shortcut, or null when it no longer points at anything. */
export function resolveShortcut(id: string, entities: ShortcutEntities = {}): ShortcutItem | null {
  const parsed = parseShortcutId(id);
  if (!parsed) return null;
  const { kind, value } = parsed;
  switch (kind) {
    case 'page': {
      const page = PAGES.find((p) => p.href === value);
      return page ? link(id, 'page', page.label, page.href) : null;
    }
    case 'action': {
      if (!Object.hasOwn(ACTIONS, value)) return null;
      const action = ACTIONS[value];
      return 'dialog' in action
        ? { id, kind, label: action.label, href: null, actionId: action.dialog }
        : link(id, kind, action.label, action.href);
    }
    case 'account': {
      const a = entities.accounts?.find((x) => x.id === value);
      return a ? link(id, kind, a.name, `/accounts/${a.id}`) : null;
    }
    case 'report': {
      const r = entities.reports?.find((x) => x.id === value);
      return r ? link(id, kind, r.name, `/reports/${r.id}`) : null;
    }
    case 'dashboard': {
      const d = entities.dashboards?.find((x) => x.id === value);
      return d ? link(id, kind, d.name, `/dashboards/${d.id}`) : null;
    }
  }
}

/** Stored ids as shortcuts, in order, unknown ones dropped (and duplicates kept once). */
export function resolveShortcuts(ids: readonly string[], entities: ShortcutEntities = {}): ShortcutItem[] {
  const seen = new Set<string>();
  const out: ShortcutItem[] = [];
  for (const id of ids) {
    const item = resolveShortcut(id, entities);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/**
 * The shortcuts behind stored ids. Only the lists the ids need are fetched; `pending` is true while one
 * of those is still loading (its items are hidden until then).
 */
export function useShortcuts(ids: readonly string[]): { items: ShortcutItem[]; pending: boolean } {
  const kinds = new Set(ids.map((id) => parseShortcutId(id)?.kind));
  const accounts = useAccounts(undefined, { enabled: kinds.has('account') });
  const reports = useReportsList({ enabled: kinds.has('report') });
  const dashboards = useDashboards(undefined, { enabled: kinds.has('dashboard') });
  const pending =
    (kinds.has('account') && accounts.isPending) ||
    (kinds.has('report') && reports.isPending) ||
    (kinds.has('dashboard') && dashboards.isPending);
  const items = useMemo(
    () => resolveShortcuts(ids, { accounts: accounts.data, reports: reports.data, dashboards: dashboards.data }),
    [ids, accounts.data, reports.data, dashboards.data],
  );
  return { items, pending };
}

/** Every shortcut the user can pick, as stored ids with labels: pages, actions, then their accounts, reports and dashboards. */
export function shortcutCatalog(entities: ShortcutEntities = {}): ShortcutItem[] {
  return [
    ...PAGES.map((p) => link(`page:${p.href}`, 'page', p.label, p.href)),
    ...Object.keys(ACTIONS).flatMap((key) => resolveShortcut(`action:${key}`) ?? []),
    ...(entities.accounts ?? []).map((a) => link(`account:${a.id}`, 'account', a.name, `/accounts/${a.id}`)),
    ...(entities.reports ?? []).map((r) => link(`report:${r.id}`, 'report', r.name, `/reports/${r.id}`)),
    ...(entities.dashboards ?? []).map((d) => link(`dashboard:${d.id}`, 'dashboard', d.name, `/dashboards/${d.id}`)),
  ];
}

/** The picker's catalog: loads the user's accounts, reports and dashboards; `pending` while any is loading. */
export function useShortcutCatalog(): { items: ShortcutItem[]; pending: boolean } {
  const accounts = useAccounts();
  const reports = useReportsList();
  const dashboards = useDashboards();
  const pending = accounts.isPending || reports.isPending || dashboards.isPending;
  const items = useMemo(
    () => shortcutCatalog({ accounts: accounts.data, reports: reports.data, dashboards: dashboards.data }),
    [accounts.data, reports.data, dashboards.data],
  );
  return { items, pending };
}

'use client';

// What a shortcut can point at, and how a stored shortcut id resolves.
//
// Ids (the shortcuts widget's `items` param, an ordered list):
//   page:/path        a page from the navigation (navItems)
//   action:<id>       a shortcut action (see ./actions)
//   account:<uuid>    one account's page
//   report:<uuid>     one saved report
//   dashboard:<uuid>  one dashboard
// An id that is malformed, names an unknown page/action, or an account /
// report / dashboard the user no longer has resolves to null (hidden).

import { BarChart3, LayoutDashboard, type LucideIcon, Wallet } from 'lucide-react';
import { createElement, type ReactNode, useMemo } from 'react';

import { NAV_ITEMS } from '@/components/layout/navigation/navItems';
import type { Account } from '@/lib/account.types';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useDashboards } from '@/lib/query/hooks/useDashboards';
import { useReportsList } from '@/lib/query/hooks/useReports';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { type DialogActionId, getAction, SHORTCUT_ACTIONS } from './actions';

export type ShortcutKind = 'page' | 'action' | 'account' | 'report' | 'dashboard';

export interface ShortcutItem {
  /** The canonical id, as stored. */
  id: string;
  kind: ShortcutKind;
  label: string;
  /** A 20px icon element. */
  icon: ReactNode;
  /** Where the tile navigates; null for a dialog action. */
  href: string | null;
  /** The dialog the tile launches (see useActionLauncher); null when it navigates. */
  actionId: DialogActionId | null;
}

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

/** Nav labels that only make sense under their module heading. */
const PAGE_LABELS: Record<string, string> = { '/rewards': 'Rewards' };

const iconEl = (icon: LucideIcon) => createElement(icon, { className: 'h-5 w-5' });

/** Every navigation page once, in navigation order. */
export const PAGE_SHORTCUTS: readonly ShortcutItem[] = (() => {
  const seen = new Set<string>();
  const out: ShortcutItem[] = [];
  for (const item of Object.values(NAV_ITEMS)) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    out.push({
      id: `page:${item.href}`,
      kind: 'page',
      label: PAGE_LABELS[item.href] ?? item.label,
      icon: item.icon,
      href: item.href,
      actionId: null,
    });
  }
  return out;
})();

function actionItem(id: string): ShortcutItem | null {
  const action = getAction(id);
  if (!action) return null;
  return {
    id: `action:${action.id}`,
    kind: 'action',
    label: action.label,
    icon: iconEl(action.icon),
    href: action.kind === 'page' ? action.href : null,
    actionId: action.kind === 'dialog' ? action.id : null,
  };
}

/** Every shortcut action. */
export const ACTION_SHORTCUTS: readonly ShortcutItem[] = Object.keys(SHORTCUT_ACTIONS).map((id) => actionItem(id)!);

/** The user's things a shortcut can name; a list still loading is undefined. */
export interface ShortcutEntities {
  accounts?: Account[];
  reports?: ReportSummaryResponse[];
  dashboards?: DashboardResponse[];
}

const accountItem = (a: Account): ShortcutItem => ({
  id: `account:${a.id}`, kind: 'account', label: a.name, icon: iconEl(Wallet), href: `/accounts/${a.id}`, actionId: null,
});
const reportItem = (r: ReportSummaryResponse): ShortcutItem => ({
  id: `report:${r.id}`, kind: 'report', label: r.name, icon: iconEl(BarChart3), href: `/reports/${r.id}`, actionId: null,
});
const dashboardItem = (d: DashboardResponse): ShortcutItem => ({
  id: `dashboard:${d.id}`, kind: 'dashboard', label: d.name, icon: iconEl(LayoutDashboard), href: `/dashboards/${d.id}`, actionId: null,
});

/** One stored id as a shortcut, or null when it no longer points at anything. */
export function resolveShortcut(id: string, entities: ShortcutEntities = {}): ShortcutItem | null {
  const parsed = parseShortcutId(id);
  if (!parsed) return null;
  const { kind, value } = parsed;
  switch (kind) {
    case 'page':
      return PAGE_SHORTCUTS.find((p) => p.href === value) ?? null;
    case 'action':
      return actionItem(value);
    case 'account': {
      const a = entities.accounts?.find((x) => x.id === value);
      return a ? accountItem(a) : null;
    }
    case 'report': {
      const r = entities.reports?.find((x) => x.id === value);
      return r ? reportItem(r) : null;
    }
    case 'dashboard': {
      const d = entities.dashboards?.find((x) => x.id === value);
      return d ? dashboardItem(d) : null;
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

/** Everything that can be picked: pages, actions, then the user's accounts, reports and dashboards. */
export function shortcutCatalog(entities: ShortcutEntities = {}): ShortcutItem[] {
  return [
    ...PAGE_SHORTCUTS,
    ...ACTION_SHORTCUTS,
    ...(entities.accounts ?? []).map(accountItem),
    ...(entities.reports ?? []).map(reportItem),
    ...(entities.dashboards ?? []).map(dashboardItem),
  ];
}

/**
 * The shortcuts behind stored ids. Only the lists the ids need are fetched;
 * `pending` is true while one of those is still loading (its items are hidden
 * until then).
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

/** The full pickable catalog (Widget settings), with every list fetched. */
export function useShortcutCatalog(): { items: ShortcutItem[]; pending: boolean } {
  const accounts = useAccounts();
  const reports = useReportsList();
  const dashboards = useDashboards();
  const items = useMemo(
    () => shortcutCatalog({ accounts: accounts.data, reports: reports.data, dashboards: dashboards.data }),
    [accounts.data, reports.data, dashboards.data],
  );
  return { items, pending: accounts.isPending || reports.isPending || dashboards.isPending };
}

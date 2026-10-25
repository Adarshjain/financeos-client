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
import {
  DEFAULT_SHORTCUTS,
  parseShortcutId,
  resolveShortcut as resolveBaseShortcut,
  resolveShortcuts as baseResolveShortcuts,
  SHORTCUT_ID_PATTERN,
  shortcutCatalog as baseShortcutCatalog,
  type ShortcutEntities,
  type ShortcutItem as BaseShortcutItem,
  type ShortcutKind,
  useShortcutCatalog as useBaseShortcutCatalog,
  useShortcuts as useBaseShortcuts,
} from '@/features/dashboards/builtins/shortcuts/shortcutsCatalog';

import { type DialogActionId, getAction } from './actions';

export type { ShortcutEntities, ShortcutKind };

export interface ShortcutItem extends Omit<BaseShortcutItem, 'actionId'> {
  /** A 20px icon element. */
  icon: ReactNode;
  /** The dialog the tile launches (see useActionLauncher); null when it navigates. */
  actionId: DialogActionId | null;
}

export { DEFAULT_SHORTCUTS, parseShortcutId, SHORTCUT_ID_PATTERN };

const iconEl = (icon: LucideIcon) => createElement(icon, { className: 'h-5 w-5' });

/** The shared item with this UI's icon: the navigation icon for a page, the action's for an action. */
function withIcon(item: BaseShortcutItem): ShortcutItem {
  switch (item.kind) {
    case 'page':
      return { ...item, icon: Object.values(NAV_ITEMS).find((n) => n.href === item.href)?.icon ?? iconEl(LayoutDashboard) };
    case 'action':
      return { ...item, icon: iconEl(getAction(item.id.slice('action:'.length))!.icon) };
    case 'account':
      return { ...item, icon: iconEl(Wallet) };
    case 'report':
      return { ...item, icon: iconEl(BarChart3) };
    case 'dashboard':
      return { ...item, icon: iconEl(LayoutDashboard) };
  }
}

const iconed = (items: BaseShortcutItem[]) => items.map(withIcon);

const PAGES_AND_ACTIONS = iconed(baseShortcutCatalog());

/** Every navigation page once, in navigation order. */
export const PAGE_SHORTCUTS: readonly ShortcutItem[] = PAGES_AND_ACTIONS.filter((i) => i.kind === 'page');

/** Every shortcut action. */
export const ACTION_SHORTCUTS: readonly ShortcutItem[] = PAGES_AND_ACTIONS.filter((i) => i.kind === 'action');

/** One stored id as a shortcut, or null when it no longer points at anything. */
export function resolveShortcut(id: string, entities: ShortcutEntities = {}): ShortcutItem | null {
  const item = resolveBaseShortcut(id, entities);
  return item ? withIcon(item) : null;
}

/** Stored ids as shortcuts, in order, unknown ones dropped (and duplicates kept once). */
export function resolveShortcuts(ids: readonly string[], entities: ShortcutEntities = {}): ShortcutItem[] {
  return iconed(baseResolveShortcuts(ids, entities));
}

/** Everything that can be picked: pages, actions, then the user's accounts, reports and dashboards. */
export function shortcutCatalog(entities: ShortcutEntities = {}): ShortcutItem[] {
  return iconed(baseShortcutCatalog(entities));
}

/** The shortcuts behind stored ids (see the shared hook), with icons. */
export function useShortcuts(ids: readonly string[]): { items: ShortcutItem[]; pending: boolean } {
  const { items, pending } = useBaseShortcuts(ids);
  return { items: useMemo(() => iconed(items), [items]), pending };
}

/** The full pickable catalog (Widget settings), with every list fetched. */
export function useShortcutCatalog(): { items: ShortcutItem[]; pending: boolean } {
  const { items, pending } = useBaseShortcutCatalog();
  return { items: useMemo(() => iconed(items), [items]), pending };
}

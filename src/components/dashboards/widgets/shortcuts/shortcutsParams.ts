// The shortcuts widget's `items` param: the stored ordered id list, its
// defaults and limit, and the list edits the params editor makes.

import { DEFAULT_SHORTCUTS } from '@/components/shortcuts/catalog';
import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';

export const ITEMS_PARAM = 'items';
/** The server's limit when the spec carries none. */
export const DEFAULT_MAX_SHORTCUTS = 12;

function stringList(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === 'string') ? (value as string[]) : null;
}

/** The ids a widget shows: its stored list, else the defaults (absent param = defaults, as on the server). */
export function shortcutIds(params: WidgetParams): readonly string[] {
  return stringList(params[ITEMS_PARAM]) ?? DEFAULT_SHORTCUTS;
}

/** The `items` param spec's default list and max size. */
export function itemsSpec(def: BuiltinWidgetResponse): { defaults: readonly string[]; max: number } {
  const spec = def.params.find((p) => p.name === ITEMS_PARAM);
  return {
    defaults: stringList(spec?.defaultValue) ?? DEFAULT_SHORTCUTS,
    max: spec?.maxItems ?? DEFAULT_MAX_SHORTCUTS,
  };
}

/** Adds `id` at the end (no-op when present or full) or removes it (never the last one). */
export function toggleId(ids: readonly string[], id: string, max: number): string[] {
  if (ids.includes(id)) return ids.length > 1 ? ids.filter((x) => x !== id) : [...ids];
  return ids.length >= max ? [...ids] : [...ids, id];
}

/** Moves the id at `index` one place up (-1) or down (+1); out-of-range moves are no-ops. */
export function moveId(ids: readonly string[], index: number, delta: -1 | 1): string[] {
  const target = index + delta;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return [...ids];
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Drops one id (an item that no longer resolves) — never the last one: the list is never empty. */
export function removeId(ids: readonly string[], id: string): string[] {
  const next = ids.filter((x) => x !== id);
  return next.length > 0 ? next : [...ids];
}

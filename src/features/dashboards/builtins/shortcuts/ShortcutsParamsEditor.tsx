'use client';

// The shortcuts widget's params editor (Add widget and Widget settings): the chosen shortcuts in order, re-ranked
// with Move up and Move down, and a searchable multi-select of the catalog grouped Pages / Actions / Accounts /
// Reports / Dashboards. At least one stays chosen; at the limit the unchosen ones are disabled.

import React from 'react';

import { ReorderList } from '@/components/ds/ReorderList/ReorderList';
import { Select, type SelectGroup } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';

import type { BuiltinParamsEditorProps } from '../types';
import { type ShortcutKind, useShortcutCatalog } from './shortcutsCatalog';
import { ITEMS_PARAM, itemsSpec } from './shortcutsParamsModel';

const GROUPS: Array<{ kind: ShortcutKind; label: string }> = [
  { kind: 'page', label: 'Pages' },
  { kind: 'action', label: 'Actions' },
  { kind: 'account', label: 'Accounts' },
  { kind: 'report', label: 'Reports' },
  { kind: 'dashboard', label: 'Dashboards' },
];

export function ShortcutsParamsEditor({ def, value, onChange }: BuiltinParamsEditorProps) {
  const { defaults, max } = itemsSpec(def);
  const stored = value[ITEMS_PARAM];
  const ids: readonly string[] = Array.isArray(stored) ? (stored as string[]) : defaults;
  const { items: catalog, pending } = useShortcutCatalog();
  const byId = React.useMemo(() => new Map(catalog.map((i) => [i.id, i])), [catalog]);
  const full = ids.length >= max;
  const setIds = (next: string[]) => onChange({ ...value, [ITEMS_PARAM]: next });

  const groups = React.useMemo<SelectGroup[]>(
    () =>
      GROUPS.map(({ kind, label }) => ({
        name: label,
        options: catalog
          .filter((i) => i.kind === kind)
          .map((i) => ({ value: i.id, label: i.label, disabled: !ids.includes(i.id) && full })),
      })).filter((g) => g.options.length > 0),
    [catalog, ids, full],
  );

  // A shortcut whose account, report or dashboard is gone is not in the catalog: the dropdown leaves it out, and
  // the next change drops it from the list.
  const known = pending ? ids : ids.filter((id) => byId.has(id));

  /** The multi-select's picks, kept in the chosen order with new ones at the end; the last one cannot be unpicked. */
  const pick = (picked: string | string[]) => {
    const list = Array.isArray(picked) ? picked : [picked];
    if (list.length === 0) return;
    const kept = ids.filter((id) => list.includes(id));
    setIds([...kept, ...list.filter((id) => !ids.includes(id))].slice(0, max));
  };

  return (
    <div className="flex flex-col gap-space-8" data-testid="shortcuts-params-editor">
      <Select
        multiple
        label="Shortcuts"
        helper={`${ids.length} of ${max}`}
        placeholder={pending ? 'Loading…' : 'Choose shortcuts'}
        searchPlaceholder="Search pages, actions, accounts…"
        groups={groups}
        value={[...known]}
        onValueChange={pick}
      />
      {ids.length === 0 ? (
        <Text variant="caption" tone="danger" as="p">
          Pick at least one shortcut.
        </Text>
      ) : (
        <ReorderList
          size="sm"
          items={ids.map((id) => ({ id, title: byId.get(id)?.label ?? (pending ? 'Loading…' : 'No longer available') }))}
          value={[...ids]}
          onValueChange={setIds}
        />
      )}
    </div>
  );
}

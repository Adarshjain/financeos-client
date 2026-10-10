'use client';

// The shortcuts widget's params editor (Add widget and Widget settings): the
// chosen shortcuts in order with Move up / Move down, a counter against the
// limit, and a searchable catalog grouped Pages / Actions / Accounts /
// Reports / Dashboards with a checkbox each. At least one stays chosen (the
// last one cannot be unticked or removed, even when it is no longer
// available); at the limit unticked rows are disabled.

import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import type { BuiltinParamsEditorProps } from '@/components/dashboards/builtins/registry';
import { type ShortcutItem, type ShortcutKind, useShortcutCatalog } from '@/components/shortcuts/catalog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { ITEMS_PARAM, itemsSpec, moveId, removeId, toggleId } from './shortcutsParams';

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
  const [query, setQuery] = useState('');
  const searchId = useId();

  const byId = useMemo(() => new Map(catalog.map((i) => [i.id, i])), [catalog]);
  const setIds = (next: string[]) => onChange({ ...value, [ITEMS_PARAM]: next });
  const full = ids.length >= max;

  const term = query.trim().toLowerCase();
  const matches = term ? catalog.filter((i) => i.label.toLowerCase().includes(term)) : catalog;

  return (
    <div className="space-y-3" data-testid="shortcuts-params-editor">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Shortcuts</p>
        <p className={cn('text-2xs tabular-nums', full ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500')} aria-live="polite">
          {ids.length} of {max}
        </p>
      </div>

      {ids.length === 0 ? (
        <p className="text-2xs text-rose-600 dark:text-rose-400">Pick at least one shortcut.</p>
      ) : (
        <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800" aria-label="Chosen shortcuts">
          {ids.map((id, i) => (
            <ChosenRow
              key={id}
              item={byId.get(id) ?? null}
              loading={pending}
              first={i === 0}
              last={i === ids.length - 1}
              only={ids.length === 1}
              onUp={() => setIds(moveId(ids, i, -1))}
              onDown={() => setIds(moveId(ids, i, 1))}
              onRemove={() => setIds(removeId(ids, id))}
            />
          ))}
        </ol>
      )}

      <div>
        <Label htmlFor={searchId}>Add or remove</Label>
        <Input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages, actions, accounts…"
          className="h-8"
        />
      </div>
      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {GROUPS.map(({ kind, label }) => {
          const rows = matches.filter((i) => i.kind === kind);
          if (rows.length === 0) return null;
          return (
            <fieldset key={kind} className="space-y-1">
              <legend className="mb-1 text-2xs font-semibold uppercase tracking-wide text-slate-500">{label}</legend>
              {rows.map((item) => {
                const checked = ids.includes(item.id);
                // The last chosen stays (at least one); unchosen rows wait while the list is full.
                const disabled = checked ? ids.length <= 1 : full;
                return (
                  <CatalogRow
                    key={item.id}
                    item={item}
                    checked={checked}
                    disabled={disabled}
                    onToggle={() => setIds(toggleId(ids, item.id, max))}
                  />
                );
              })}
            </fieldset>
          );
        })}
        {matches.length === 0 && !pending && <p className="py-2 text-xs text-slate-500">Nothing matches “{query.trim()}”</p>}
      </div>
    </div>
  );
}

function ChosenRow({
  item,
  loading,
  first,
  last,
  only,
  onUp,
  onDown,
  onRemove,
}: {
  item: ShortcutItem | null;
  loading: boolean;
  first: boolean;
  last: boolean;
  /** The only chosen shortcut: it cannot be removed (the list is never empty). */
  only: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const label = item?.label ?? (loading ? 'Loading…' : 'No longer available');
  return (
    <li className="flex items-center gap-2 px-2 py-1.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-500 [&_svg]:h-4 [&_svg]:w-4" aria-hidden>
        {item?.icon}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-xs', item ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500')}>
        {label}
      </span>
      {item || loading ? (
        <>
          <Button type="button" variant="ghost" size="icon-xs" disabled={first} onClick={onUp} aria-label={`Move ${label} up`}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" disabled={last} onClick={onDown} aria-label={`Move ${label} down`}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        // A shortcut whose account / report / dashboard is gone is not in the catalog to untick.
        // The only one stays until another is picked (an empty list cannot be saved).
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          disabled={only}
          aria-label="Remove unavailable shortcut"
          title={only ? 'Pick another shortcut first' : undefined}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  );
}

function CatalogRow({
  item,
  checked,
  disabled,
  onToggle,
}: {
  item: ShortcutItem;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 py-0.5">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={onToggle} />
      <label
        htmlFor={id}
        className={cn('min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200', disabled && 'opacity-50')}
      >
        {item.label}
      </label>
    </div>
  );
}

'use client';

import { ChevronsUpDown, Loader2, Plus } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CounterpartyResponse, CounterpartySelection } from '@/lib/lending.types';
import { useCounterpartySearch } from '@/lib/query/hooks/useCounterparties';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { cn, formatMoney } from '@/lib/utils';

export const SEARCH_DEBOUNCE_MS = 250;

interface CounterpartyPickerProps {
  /** Lands on the search trigger so the `Label` (and E2E) can target it. */
  id?: string;
  label?: string;
  value: CounterpartySelection | null;
  onChange: (next: CounterpartySelection | null) => void;
  /** Counterparty pre-filled from the transaction description; flagged so the
   *  user knows why it's there rather than reading it as a random default. */
  suggestedId?: string | null;
  disabled?: boolean;
}

/** "Owes you ₹1,200" / "You owe ₹500" / "Settled" / "No entries yet". */
export function positionLabel(cp: CounterpartyResponse): string {
  if (cp.entryCount === 0) return 'No entries yet';
  if (cp.netPosition > 0) return `Owes you ${formatMoney(cp.netPosition)}`;
  if (cp.netPosition < 0) return `You owe ${formatMoney(-cp.netPosition)}`;
  return 'Settled';
}

function entriesLabel(count: number): string {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`;
}

function CounterpartyRow({ cp, suggested }: { cp: CounterpartyResponse; suggested: boolean }) {
  return (
    <div className="flex flex-col min-w-0 flex-1">
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{cp.name}</span>
        {suggested && (
          <Badge variant="violet" size="xs">
            Suggested
          </Badge>
        )}
      </span>
      <span className="text-2xs text-slate-500 dark:text-slate-400 truncate">
        {positionLabel(cp)} · {entriesLabel(cp.entryCount)}
      </span>
    </div>
  );
}

/**
 * Single-select person picker for the lending forms: type to search the
 * server, pick a row, or add the typed name as a new person. Creating is a
 * footer row rather than a list entry, so there is no sentinel value for
 * callers to special-case and no second "name" input to fill.
 */
export function CounterpartyPicker({
  id,
  label = 'Person',
  value,
  onChange,
  suggestedId,
  disabled,
}: CounterpartyPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const term = search.trim();
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS);

  const query = useCounterpartySearch(debouncedTerm, open && !disabled);
  const people = React.useMemo(() => query.data?.content ?? [], [query.data]);
  const total = query.data?.totalElements ?? 0;
  const hasMore = total > people.length;

  const hasExactMatch = people.some((cp) => cp.name.toLowerCase() === term.toLowerCase());
  const canCreate = term.length > 0 && !hasExactMatch;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  const pick = (next: CounterpartySelection) => {
    onChange(next);
    handleOpenChange(false);
  };

  if (value) {
    const isNew = value.kind === 'new';
    const name = isNew ? value.name : value.counterparty.name;
    const isSuggested = !isNew && Boolean(suggestedId) && value.counterparty.id === suggestedId;
    return (
      <div className="space-y-1">
        {/* No htmlFor here: pointing the label at the Change button would
            rename that button to "Person" for screen readers. */}
        <Label className="text-xs">{label} *</Label>
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
          <div className="flex flex-col min-w-0">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{name}</span>
              {isNew ? (
                <Badge variant="info" size="xs">
                  New
                </Badge>
              ) : (
                isSuggested && (
                  <Badge variant="violet" size="xs">
                    Suggested
                  </Badge>
                )
              )}
            </span>
            <span className="text-2xs text-slate-500 dark:text-slate-400 truncate">
              {isNew
                ? 'Will be added when you save'
                : `${positionLabel(value.counterparty)} · ${entriesLabel(value.counterparty.entryCount)}`}
            </span>
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="micro" onClick={() => onChange(null)}>
              Change
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label} *
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-9 w-full justify-between font-normal text-slate-500 dark:text-slate-400"
          >
            <span className="truncate">Search or add a person</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[16rem]"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Type a name..."
              className="h-9 text-xs"
            />
            <CommandList className="max-h-56">
              {query.isPending ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  {people.length === 0 && !canCreate && (
                    <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      No people yet. Type a name to add one.
                    </p>
                  )}
                  {people.length > 0 && (
                    <CommandGroup>
                      {people.map((cp) => (
                        <CommandItem
                          key={cp.id}
                          value={cp.id}
                          onSelect={() => pick({ kind: 'existing', counterparty: cp })}
                          className="text-xs cursor-pointer"
                        >
                          <CounterpartyRow cp={cp} suggested={cp.id === suggestedId} />
                        </CommandItem>
                      ))}
                      {hasMore && (
                        <p className="px-2 py-1.5 text-2xs text-slate-400">
                          Showing {people.length} of {total}. Keep typing to narrow down.
                        </p>
                      )}
                    </CommandGroup>
                  )}
                  {canCreate && (
                    <CommandGroup
                      className={cn(people.length > 0 && 'border-t border-slate-100 dark:border-slate-800')}
                    >
                      <CommandItem
                        value="__create__"
                        onSelect={() => pick({ kind: 'new', name: term })}
                        className="text-xs cursor-pointer font-semibold text-emerald-700 dark:text-emerald-400"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="truncate">Add &ldquo;{term}&rdquo;</span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

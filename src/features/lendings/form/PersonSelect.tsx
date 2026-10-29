'use client';

import React from 'react';

import { Select, type SelectOption } from '@/components/ds';
import { type CounterpartyResponse, type CounterpartySelection } from '@/lib/lending.types';
import { useCounterpartySearch } from '@/lib/query/hooks/useCounterparties';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/useDebouncedValue';

import { entriesLabel, positionLabel } from '../lendingEntryForm';

const NEW_PREFIX = 'new:';

function personOption(cp: CounterpartyResponse): SelectOption {
  return { value: cp.id, label: cp.name, hint: `${positionLabel(cp)} · ${entriesLabel(cp.entryCount)}` };
}

export interface PersonSelectProps {
  value: CounterpartySelection | null;
  onChange: (party: CounterpartySelection) => void;
  error?: string;
}

/** The Person field of a ledger entry: search the people already there, or type a name to add a new one. */
export function PersonSelect({ value, onChange, error }: PersonSelectProps) {
  const [search, setSearch] = React.useState('');
  const term = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const { data: found } = useCounterpartySearch(term);
  const people = React.useMemo(() => found?.content ?? [], [found]);

  const options = React.useMemo(() => {
    const list = people.map(personOption);
    if (value?.kind === 'existing' && !people.some((p) => p.id === value.counterparty.id)) {
      list.unshift(personOption(value.counterparty));
    }
    if (value?.kind === 'new') list.unshift({ value: NEW_PREFIX + value.name, label: value.name, hint: 'New person' });
    return list;
  }, [people, value]);

  const pick = (picked: string) => {
    if (picked.startsWith(NEW_PREFIX)) return;
    const existing = people.find((p) => p.id === picked);
    if (existing) onChange({ kind: 'existing', counterparty: existing });
  };

  return (
    <Select
      label="Person"
      placeholder="Pick or type a name"
      searchable
      searchPlaceholder="Type a name"
      searchValue={search}
      onSearchChange={setSearch}
      filter="none"
      options={options}
      value={value ? (value.kind === 'new' ? NEW_PREFIX + value.name : value.counterparty.id) : ''}
      onValueChange={(v) => pick(v as string)}
      onCreate={(name) => onChange({ kind: 'new', name })}
      createLabel={(name) => `Add "${name}"`}
      emptyText={() => 'No people yet. Type a name to add one.'}
      error={error}
    />
  );
}

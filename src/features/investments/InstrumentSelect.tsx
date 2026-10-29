'use client';

import React from 'react';

import { Select, type SelectGroup, type SelectOption, showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { InstrumentCandidate, InstrumentType } from '@/lib/types';

import { candidateKey } from './instruments/CatalogSearch';
import { useCatalogSearch, useResolveInstrumentMutation } from './instruments/useCatalogSearch';
import { instrumentLabel, type InstrumentRef, TYPE_WORDS } from './investmentsFormat';

function candidateOption(c: InstrumentCandidate): SelectOption {
  return {
    value: candidateKey(c),
    label: instrumentLabel(c),
    hint: TYPE_WORDS[c.type],
    description: c.amfiCode ? `AMFI ${c.amfiCode}` : [c.symbol || 'No symbol', c.exchange].filter(Boolean).join(' · '),
  };
}

export interface InstrumentSelectProps {
  label?: string;
  helper?: string;
  error?: string;
  value: (InstrumentRef & { type?: InstrumentType }) | null;
  onValueChange: (instrument: InstrumentRef) => void;
  /** Narrows the search to one type. */
  type?: InstrumentType;
  disabled?: boolean;
  /** True (default): every pick is resolved on the server. False: an entry the user already has is used as it is. */
  resolveExisting?: boolean;
  /** Called with a message when the pick could not be saved; without it the message is a toast. */
  onResolveError?: (message: string) => void;
  /** Adds an "Enter it manually" link at the foot of the list. */
  onEnterManually?: () => void;
  /** Tells the form when a pick is still being resolved, so it can hold its submit until the field has the instrument. */
  onResolvingChange?: (resolving: boolean) => void;
  /** Opens the list from this element instead of the field (a link in a table row); the field's label is then not drawn. */
  trigger?: React.ReactNode;
}

/**
 * The instrument field: search your catalog first, then the AMFI and Yahoo feeds. Picking an entry resolves it on the
 * server (finds it or adds it), and the field then holds that instrument.
 */
export function InstrumentSelect({
  label = 'Instrument',
  helper,
  error,
  value,
  onValueChange,
  type,
  disabled,
  resolveExisting = true,
  onResolveError,
  onEnterManually,
  onResolvingChange,
  trigger,
}: InstrumentSelectProps) {
  const [query, setQuery] = React.useState('');
  const { results, isLoading, hasQuery } = useCatalogSearch(query, type);
  const resolve = useResolveInstrumentMutation();
  const resolving = resolve.isPending;
  React.useEffect(() => {
    onResolvingChange?.(resolving);
  }, [resolving, onResolvingChange]);

  const selectedKey = value ? `selected:${value.id}` : '';
  const groups = React.useMemo<SelectGroup[]>(() => {
    const out: SelectGroup[] = [];
    const local = results.filter((r) => r.source === 'LOCAL');
    const external = results.filter((r) => r.source !== 'LOCAL');
    if (value) {
      out.push({ name: 'Selected', options: [{ value: selectedKey, label: instrumentLabel(value), hint: value.type ? TYPE_WORDS[value.type] : undefined }] });
    }
    if (local.length > 0) out.push({ name: 'In your catalog', options: local.map(candidateOption) });
    if (external.length > 0) out.push({ name: 'Search results', options: external.map(candidateOption) });
    return out;
  }, [results, value, selectedKey]);

  const pick = async (key: string) => {
    if (key === selectedKey) return;
    const candidate = results.find((c) => candidateKey(c) === key);
    if (!candidate) return;
    if (!resolveExisting && candidate.existingInstrumentId) {
      onValueChange({ id: candidate.existingInstrumentId, name: candidate.name, symbol: candidate.symbol });
      return;
    }
    try {
      const resolved = await resolve.mutateAsync({
        type: candidate.type,
        name: candidate.name,
        symbol: candidate.symbol,
        exchange: candidate.exchange,
        isin: candidate.isin,
        amfiCode: candidate.amfiCode,
        yahooSymbol: candidate.yahooSymbol,
        currency: candidate.currency,
        existingInstrumentId: candidate.existingInstrumentId,
      });
      onValueChange(resolved);
      setQuery('');
    } catch (e) {
      const message = getErrorMessage(e, "Couldn't add the instrument. Try again.");
      if (onResolveError) onResolveError(message);
      else showToast(message, { tone: 'danger' });
    }
  };

  const typed = query.trim().length >= 2;
  // The search starts a moment after typing pauses: until then the answer is not in yet, so it is not "no results".
  const searching = isLoading || (typed && !hasQuery);
  return (
    <Select
      label={trigger ? undefined : label}
      helper={helper}
      error={error}
      placeholder="Search by name or symbol"
      groups={groups}
      value={selectedKey}
      onValueChange={(v) => void pick(v as string)}
      searchable
      searchPlaceholder="Search by name or symbol"
      searchValue={query}
      onSearchChange={setQuery}
      filter="none"
      loading={resolve.isPending}
      loadingText="Adding…"
      trigger={trigger}
      disabled={disabled}
      actions={onEnterManually ? [{ label: 'Enter it manually', onSelect: onEnterManually }] : undefined}
      emptyText={() => (searching ? 'Searching…' : typed ? 'No instruments match' : 'Type at least 2 characters to search.')}
    />
  );
}

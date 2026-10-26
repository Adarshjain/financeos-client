'use client';

import React from 'react';

import { Badge, Card, Icon, ListRow, SectionHeader, Text, TextField } from '@/components/ds';
import type { InstrumentCandidate, InstrumentType } from '@/lib/types';

import { typeWord } from './instrumentsModel';
import { useCatalogSearch } from './useCatalogSearch';

/** The stable key of a catalog entry, to mark the one being added. */
export function candidateKey(c: InstrumentCandidate): string {
  return c.existingInstrumentId || c.amfiCode || c.yahooSymbol || `${c.source}-${c.name}`;
}

function subtitleOf(c: InstrumentCandidate): string {
  if (c.amfiCode) return `AMFI ${c.amfiCode}`;
  return `${c.symbol || 'No symbol'}${c.exchange ? ` · ${c.exchange}` : ''}`;
}

export interface CatalogSearchProps {
  /** Narrows the search to one type. */
  type?: InstrumentType;
  autoFocus?: boolean;
  placeholder?: string;
  /** Show the "type at least 2 characters" line while nothing is typed. */
  hint?: boolean;
  /** The entry being added right now (its row shows "Adding…" and the rest are disabled). */
  busyKey?: string | null;
  onPick: (candidate: InstrumentCandidate) => void;
}

/** Search the live AMFI and Yahoo catalogs and pick an entry: your own catalog first, then the feeds. */
export function CatalogSearch({ type, autoFocus, placeholder = 'Search by name or symbol', hint = true, busyKey = null, onPick }: CatalogSearchProps) {
  const [query, setQuery] = React.useState('');
  const { results, isLoading } = useCatalogSearch(query, type);
  const local = results.filter((r) => r.source === 'LOCAL');
  const external = results.filter((r) => r.source !== 'LOCAL');
  const typed = query.trim().length >= 2;

  const row = (c: InstrumentCandidate) => {
    const key = candidateKey(c);
    return (
      <ListRow
        key={key}
        title={c.name}
        subtitle={subtitleOf(c)}
        disabled={busyKey !== null && busyKey !== key}
        onClick={() => onPick(c)}
        trailing={
          busyKey === key ? (
            <Text variant="label" tone="ink-3">
              Adding…
            </Text>
          ) : (
            <span className="flex items-center gap-space-8">
              {c.pricePreview ? (
                <Text variant="label" tone="ink-3">{`₹${c.pricePreview.value} · ${c.pricePreview.asOf}`}</Text>
              ) : null}
              <Badge variant="outline" size="sm">
                {typeWord(c.type)}
              </Badge>
            </span>
          )
        }
      />
    );
  };

  return (
    <div className="flex flex-col gap-space-8">
      <TextField
        type="search"
        size="md"
        autoFocus={autoFocus}
        prefix={<Icon name="search" size="sm" />}
        clearable
        placeholder={placeholder}
        value={query}
        onValueChange={setQuery}
      />
      {isLoading ? (
        <Text variant="label" tone="ink-3" as="div">
          Searching…
        </Text>
      ) : results.length > 0 ? (
        <Card>
          {local.length > 0 ? (
            <>
              <SectionHeader variant="band">In your catalog</SectionHeader>
              {local.map(row)}
            </>
          ) : null}
          {external.length > 0 ? (
            <>
              <SectionHeader variant="band">Search results</SectionHeader>
              {external.map(row)}
            </>
          ) : null}
        </Card>
      ) : typed ? (
        <Text variant="label" tone="ink-3" as="div">
          No matches. Enter it by hand.
        </Text>
      ) : hint ? (
        <Text variant="label" tone="ink-3" as="div">
          Type at least 2 characters to search.
        </Text>
      ) : null}
    </div>
  );
}

'use client';

import React from 'react';

import { Button, StatusWord, Text } from '@/components/ds';
import type { InstrumentType } from '@/lib/types';

import { InstrumentSelect } from '../InstrumentSelect';
import { NestedControls } from './NestedControls';
import type { RowState } from './types';

export interface MappingCellProps {
  /** What the row is called while no instrument is chosen ("IDEAFORGE"). */
  label: string;
  /** The instrument the server matched, if any. */
  matchedName?: string;
  duplicate: boolean;
  state: RowState | undefined;
  /** Narrows the search to stocks or to funds. */
  type: InstrumentType;
  disabled?: boolean;
  onMap: (instrument: { id: string; name: string }) => void;
  onCreateNew: (createNew: boolean) => void;
}

/**
 * The Status / map cell of a review row: Mapped (blue) with "change", New with "undo", the matched
 * instrument, or Unmatched (amber) with "Map instrument" and "Create new"; a duplicate says so after it.
 */
export function MappingCell({ label, matchedName, duplicate, state, type, disabled, onMap, onCreateNew }: MappingCellProps) {
  const search = (action: string) => (
    <InstrumentSelect
      type={type}
      value={null}
      disabled={disabled}
      onValueChange={(inst) => onMap({ id: inst.id, name: inst.name })}
      trigger={
        <Button type="button" variant="link" size="sm" disabled={disabled}>
          {action}
        </Button>
      }
    />
  );

  // A row the server matched starts with its instrument selected but unnamed: that reads as the matched instrument, not as a mapping.
  const mapped = Boolean(state?.selectedInstrumentId) && (Boolean(state?.selectedInstrumentName) || !matchedName);
  let body: React.ReactNode;
  if (mapped) {
    body = (
      <>
        <StatusWord tone="info">Mapped</StatusWord>
        <Text variant="body" as="span">
          {state?.selectedInstrumentName || 'Mapped'}
        </Text>
        {search('change')}
      </>
    );
  } else if (state?.createNew) {
    body = (
      <>
        <StatusWord tone="neutral">New</StatusWord>
        <Text variant="body-strong" as="span">
          {label}
        </Text>
        <Text variant="label" tone="ink-3" as="span">
          no live price
        </Text>
        <Button type="button" variant="link" size="sm" disabled={disabled} onClick={() => onCreateNew(false)}>
          undo
        </Button>
      </>
    );
  } else if (matchedName) {
    body = (
      <>
        <Text variant="body" as="span">
          {matchedName}
        </Text>
        {search('change')}
      </>
    );
  } else {
    body = (
      <>
        <StatusWord tone="warning">Unmatched</StatusWord>
        {search('Map instrument')}
        <Button type="button" variant="link" size="sm" disabled={disabled} onClick={() => onCreateNew(true)}>
          Create new
        </Button>
      </>
    );
  }

  return (
    <NestedControls>
      {body}
      {duplicate ? (
        <Text variant="body" tone="ink-3" as="span">
          {' · Duplicate'}
        </Text>
      ) : null}
    </NestedControls>
  );
}

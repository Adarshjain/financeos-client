'use client';

import React from 'react';

import { SegmentedControl } from '@/components/ds/SegmentedControl/SegmentedControl';

import { OldCardFields } from './OldCardFields';
import type { OldCardState } from './useOldCard';

export type NumberKind = 'number' | 'card';

const OPTIONS = [
  { value: 'number', label: 'Another number' },
  { value: 'card', label: 'An old card' },
];

/** What a number is on its account: another number (an identifier) or an old card; an old card also asks who held it and when. */
export function NumberKindChoice({
  kind,
  onKindChange,
  state,
  today,
  errors,
  disabled,
}: {
  kind: NumberKind;
  onKindChange: (kind: NumberKind) => void;
  state: OldCardState;
  today: string;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <>
      <SegmentedControl
        fullWidth
        aria-label="This number is"
        options={OPTIONS}
        value={kind}
        onValueChange={(v) => onKindChange(v as NumberKind)}
        disabled={disabled}
      />
      {kind === 'card' ? <OldCardFields state={state} today={today} errors={errors} disabled={disabled} /> : null}
    </>
  );
}

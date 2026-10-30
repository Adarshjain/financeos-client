'use client';

import React from 'react';

import { DateField } from '@/components/ds/DateField/DateField';
import { Select } from '@/components/ds/Select/Select';

import { PERIOD_OPTIONS } from './filterOptionsModel';
import type { FiltersDraft, PeriodMode } from './filtersDraftModel';
import type { PeriodPresetId } from './transactionsUrl';

const PERIOD_MODES = [
  { value: 'preset', label: 'Preset' },
  { value: 'date', label: 'Single date' },
  { value: 'range', label: 'Range' },
];

export type PeriodDraft = Pick<
  FiltersDraft,
  'periodMode' | 'preset' | 'date' | 'from' | 'to'
>;

export interface PeriodEditorProps {
  draft: PeriodDraft;
  /** Today, YYYY-MM-DD, for the date fields. */
  today: string;
  onChange: (patch: Partial<PeriodDraft>) => void;
}

/** The Preset / Single date / Range select and the field it shows; shared by the Filters dialog and the Period dropdown. */
export function PeriodEditor({ draft, today, onChange }: PeriodEditorProps) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-12">
      <Select
        aria-label="Period type"
        options={PERIOD_MODES}
        value={draft.periodMode}
        onValueChange={(mode) => onChange({ periodMode: mode as PeriodMode })}
      />
      {draft.periodMode === 'preset' ? (
        <Select
          aria-label="Preset"
          options={PERIOD_OPTIONS}
          value={draft.preset}
          onValueChange={(preset) =>
            onChange({ preset: preset as PeriodPresetId })
          }
        />
      ) : null}
      {draft.periodMode === 'date' ? (
        <DateField
          aria-label="Date"
          today={today}
          value={draft.date}
          onValueChange={(date) => onChange({ date: date as string })}
        />
      ) : null}
      {draft.periodMode === 'range' ? (
        <DateField
          range
          aria-label="Range"
          today={today}
          value={{ start: draft.from, end: draft.to }}
          onValueChange={(range) => {
            if (typeof range === 'object')
              onChange({ from: range.start ?? '', to: range.end ?? '' });
          }}
        />
      ) : null}
    </div>
  );
}

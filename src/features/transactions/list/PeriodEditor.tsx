'use client';

import React from 'react';

import { DateField, SegmentedControl, Select } from '@/components/ds';

import { PERIOD_OPTIONS } from './filterOptions';
import type { FiltersDraft, PeriodMode } from './filtersDraft';
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

/** The Preset / Single date / Range control and the field it shows; shared by the Filters dialog and the Period dropdown. */
export function PeriodEditor({ draft, today, onChange }: PeriodEditorProps) {
  return (
    <div className="flex flex-col gap-space-12">
      <SegmentedControl
        aria-label="Period type"
        className="w-fit"
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

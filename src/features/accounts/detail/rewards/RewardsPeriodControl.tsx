'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { DateField, Select } from '@/components/ds';

import { rewardsHref, type RewardsQuery } from './rewardsModel';
import { DEFAULT_PERIOD, RANGE_PRESET_LABELS, RANGE_PRESETS, type RangePreset } from './rewardsPeriod';

const OPTIONS = RANGE_PRESETS.map((p) => ({ value: p, label: RANGE_PRESET_LABELS[p] }));

export interface RewardsPeriodControlProps {
  /** The page's own URL, without params. */
  basePath: string;
  query: RewardsQuery;
  /** The dates the page is showing. */
  window: { from: string; to: string };
  today: string;
}

/** The period select, with two date fields when it is Custom. A change goes to the address (page back to the first). */
export function RewardsPeriodControl({ basePath, query, window, today }: RewardsPeriodControlProps) {
  const router = useRouter();
  const preset = query.period ?? DEFAULT_PERIOD;
  const go = (next: Partial<RewardsQuery>) => router.push(rewardsHref(basePath, { ...query, ...next, page: 0 }));

  const choose = (value: string | string[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    const period = RANGE_PRESETS.find((p): p is RangePreset => p === next);
    if (!period) return;
    // Custom starts from the dates on screen, so the fields are never empty.
    go(period === 'CUSTOM' ? { period, from: window.from, to: window.to } : { period, from: undefined, to: undefined });
  };

  return (
    <div className="flex flex-col desk:flex-row desk:items-end gap-space-12">
      <Select label="Period" options={OPTIONS} value={preset} onValueChange={choose} />
      {preset === 'CUSTOM' ? (
        <>
          <DateField
            label="From"
            today={today}
            value={window.from}
            maxDate={window.to}
            onValueChange={(v) => (typeof v === 'string' && v ? go({ period: 'CUSTOM', from: v, to: window.to }) : undefined)}
          />
          <DateField
            label="To"
            today={today}
            value={window.to}
            minDate={window.from}
            onValueChange={(v) => (typeof v === 'string' && v ? go({ period: 'CUSTOM', from: window.from, to: v }) : undefined)}
          />
        </>
      ) : null}
    </div>
  );
}

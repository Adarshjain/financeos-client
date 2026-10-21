'use client';

import React from 'react';

import { Card, ProgressBar, Text } from '@/components/ds';

import type { FySplit } from './scheduleModel';

/** Interest against principal in each financial year's EMIs, one split bar per year. */
export function SplitCard({ splits }: { splits: FySplit[] }) {
  if (splits.length === 0) return null;
  return (
    <Card title="Interest vs principal" subtitle="Per financial year">
      <div className="flex flex-col gap-space-12 px-space-16 pb-space-14">
        {splits.map((s) => (
          <div key={s.label} className="flex flex-col gap-space-4">
            <div className="flex items-baseline justify-between gap-space-8">
              <Text variant="body-strong" as="span">
                {s.label}
              </Text>
              <Text tone="ink-3" as="span">{`${s.emiTotal} · ${s.emis} ${s.emis === 1 ? 'EMI' : 'EMIs'}`}</Text>
            </div>
            <ProgressBar
              segments={[
                { label: 'interest', value: s.interest, color: 'chart-rest' },
                { label: 'principal', value: s.principal, color: 'brand' },
              ]}
            />
          </div>
        ))}
        <ProgressBar.Legend
          items={[
            { label: 'interest', color: 'chart-rest' },
            { label: 'principal', color: 'brand' },
          ]}
        />
      </div>
    </Card>
  );
}

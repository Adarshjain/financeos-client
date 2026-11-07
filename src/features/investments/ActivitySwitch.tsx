'use client';

import { usePathname, useRouter } from 'next/navigation';
import React from 'react';

import { SegmentedControl } from '@/components/ds/SegmentedControl/SegmentedControl';
import { appHref } from '@/features/shell/routes';

import { activeActivityChoice, type ActivityChoiceId, activityChoices } from './investmentsTabs';

/** Trades · Dividends · Corporate actions: each choice is its own route. On phone the row scrolls sideways, never wraps. */
export function ActivitySwitch() {
  const router = useRouter();
  const choice = activeActivityChoice(usePathname());
  const go = (id: ActivityChoiceId) => {
    const target = activityChoices.find((c) => c.id === id);
    if (target && id !== choice) router.push(appHref(target.path));
  };
  return (
    <div className="max-desk:overflow-x-auto scrollbar-none">
      <SegmentedControl
        aria-label="Activity"
        size="sm"
        options={activityChoices.map((c) => ({ value: c.id, label: c.label }))}
        value={choice}
        onValueChange={go}
        className="max-desk:w-max"
      />
    </div>
  );
}

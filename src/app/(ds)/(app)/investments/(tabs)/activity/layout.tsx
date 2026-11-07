import React from 'react';

import { ActivitySwitch } from '@/features/investments/ActivitySwitch';

/** The Activity tab: the Trades · Dividends · Corporate actions choice, then the chosen list. */
export default function DsActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <ActivitySwitch />
      {children}
    </div>
  );
}

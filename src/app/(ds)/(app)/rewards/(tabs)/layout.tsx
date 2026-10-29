import React from 'react';

import { RewardsShell } from '@/features/rewards/overview/RewardsShell';

// The top bar reads "Rewards" on every tab, so the tab title does too.
export const metadata = { title: 'Rewards' };

export default function DsRewardsLayout({ children }: { children: React.ReactNode }) {
  return <RewardsShell>{children}</RewardsShell>;
}

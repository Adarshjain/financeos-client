import React from 'react';

import { RewardsShell } from '@/features/rewards/overview/RewardsShell';

export default function DsRewardsLayout({ children }: { children: React.ReactNode }) {
  return <RewardsShell>{children}</RewardsShell>;
}

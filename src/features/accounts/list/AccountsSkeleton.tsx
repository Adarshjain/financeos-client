import React from 'react';

import { Hero } from '@/components/ds';

import { AccountsTablesSkeleton } from './AccountsSections';

/** The Accounts list while it loads: the hero and the tables. */
export function AccountsSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Hero.Skeleton label figures={3} />
      <AccountsTablesSkeleton />
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner } from '@/components/ds';

import { accountHref } from '../accountTabsModel';
import type { RewardsBanner } from './rewardsModel';

/** The amber notes of the report. "Manage cards" opens the account's Cards tab. */
export function RewardsBanners({ accountId, banners }: { accountId: string; banners: RewardsBanner[] }) {
  const router = useRouter();
  if (banners.length === 0) return null;
  return (
    <div className="flex flex-col gap-space-8">
      {banners.map((b) => (
        <Banner
          key={b.key}
          tone="warning"
          action={b.action ? { label: b.action.label, onSelect: () => router.push(`${accountHref(accountId)}/cards`) } : undefined}
        >
          {b.text}
        </Banner>
      ))}
    </div>
  );
}

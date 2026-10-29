import type { Metadata } from 'next';
import React from 'react';

import { loadHoldingPage } from '@/features/investments/holding/holdingData';
import { holdingHeader } from '@/features/investments/holding/holdingModel';
import { HoldingView } from '@/features/investments/holding/HoldingView';
import { LivePriceRefresh } from '@/features/investments/LivePriceRefresh';
import { todayInAppZone } from '@/lib/date-range';

type Params = { params: Promise<{ instrumentId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { holding } = await loadHoldingPage((await params).instrumentId);
  return { title: holdingHeader(holding).title };
}

/** /investments/[instrumentId]: one holding, one page. Each list reads its first page here and pages through server actions; an old `?tab=` or `?page=` address renders the same page. */
export default async function DsHoldingPage({ params }: Params) {
  const data = await loadHoldingPage((await params).instrumentId);
  return (
    <>
      <LivePriceRefresh />
      <HoldingView data={data} today={todayInAppZone()} now={new Date().toISOString()} />
    </>
  );
}

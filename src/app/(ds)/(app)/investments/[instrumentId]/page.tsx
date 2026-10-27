import React from 'react';

import { loadHoldingPage } from '@/features/investments/holding/holdingData';
import { HoldingView } from '@/features/investments/holding/HoldingView';
import { LivePriceRefresh } from '@/features/investments/LivePriceRefresh';
import { todayInAppZone } from '@/lib/date-range';

/** /investments/[instrumentId]: one holding, one page. Each list reads its first page here and pages through server actions; an old `?tab=` or `?page=` address renders the same page. */
export default async function DsHoldingPage({ params }: { params: Promise<{ instrumentId: string }> }) {
  const { instrumentId } = await params;
  const data = await loadHoldingPage(instrumentId);
  return (
    <>
      <LivePriceRefresh />
      <HoldingView data={data} today={todayInAppZone()} now={new Date().toISOString()} />
    </>
  );
}

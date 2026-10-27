import { redirect } from 'next/navigation';
import React from 'react';

import { loadHoldingPage } from '@/features/investments/holding/holdingData';
import { holdingTabHref, parseHoldingTab, parsePage } from '@/features/investments/holding/holdingModel';
import { HoldingView } from '@/features/investments/holding/HoldingView';
import { LivePriceRefresh } from '@/features/investments/LivePriceRefresh';
import { todayInAppZone } from '@/lib/date-range';

/** /investments/[instrumentId]: one holding. `?tab=` picks Overview, Trades, Dividends, Corporate actions or Prices; `?page=` pages that tab's list. */
export default async function DsHoldingPage({
  params,
  searchParams,
}: {
  params: Promise<{ instrumentId: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { instrumentId } = await params;
  const query = await searchParams;
  const tab = parseHoldingTab(query.tab);
  const page = parsePage(query.page);
  const data = await loadHoldingPage(instrumentId, tab, page);
  // A page past the end (the last row of the last page was deleted, or a stale address) shows the last page.
  const totalPages = { trades: data.trades?.totalPages, dividends: data.dividends?.totalPages, prices: data.prices?.totalPages }[tab as string];
  if (page > 0 && totalPages && page >= totalPages) redirect(holdingTabHref(instrumentId, tab, totalPages - 1));
  return (
    <>
      <LivePriceRefresh />
      <HoldingView data={data} tab={tab} today={todayInAppZone()} now={new Date().toISOString()} />
    </>
  );
}

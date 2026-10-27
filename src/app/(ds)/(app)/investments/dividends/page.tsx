import { redirect } from 'next/navigation';
import React from 'react';

import {
  BY_INSTRUMENT_SIZE,
  BY_INSTRUMENT_YEARS,
  byInstrumentRow,
  dividendFilters,
  dividendListRow,
  dividendsFigures,
  dividendsUrl,
  effectiveFy,
  figureFilters,
  fyOptions,
  fyStartOf,
  fyTotals,
  listTotals,
  notReceivedCounts,
  type NotReceivedStatus,
  parseDividendsUrl,
  totalsLine,
} from '@/features/investments/dividends/dividendsModel';
import {
  fetchByInstrument,
  fetchDividends,
  fetchDividendSummary,
  fetchReceiptSummary,
  fetchSymbolsByReceipt,
} from '@/features/investments/dividends/dividendsServerApi';
import { DividendsView } from '@/features/investments/dividends/DividendsView';
import { fetchBrokers, fetchInstrument } from '@/features/investments/investmentsServerApi';
import { LoansLoadError } from '@/features/loans/LoansLoadError';
import { loaded, orNull } from '@/features/shell/loadHelpers';
import { todayInAppZone } from '@/lib/date-range';
import type { DividendFilters } from '@/lib/investments.types';

type SearchParams = {
  fy?: string;
  broker?: string;
  type?: string;
  receipt?: string;
  instrumentId?: string;
  page?: string;
  size?: string;
  ip?: string;
};

/** The receipt buckets, then (in the same pass as the other reads) the few instruments behind each "Not received" status. */
async function readReceipts(filters: DividendFilters) {
  const receipts = await fetchReceiptSummary(filters);
  const counts = notReceivedCounts(receipts);
  const named = await Promise.all(counts.map(({ status }) => orNull(fetchSymbolsByReceipt(filters, status))));
  const names: Partial<Record<NotReceivedStatus, string[]>> = {};
  counts.forEach(({ status }, i) => {
    if (named[i]) names[status] = named[i];
  });
  return { receipts, names };
}

/** /investments/dividends. The FY, filters and pages are in the URL and answered by the server. */
export default async function DsDividendsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = parseDividendsUrl(await searchParams);
  const today = todayInAppZone();
  const currentFy = fyStartOf(today);
  const fy = effectiveFy(state, today);
  const filters = dividendFilters(state, fy);
  const figureQuery = figureFilters(state, fy);

  const [list, summary, receiptsAndNames, byInstrument, brokers, instrument] = await Promise.all([
    loaded(fetchDividends(filters, state.page, state.size)),
    orNull(fetchDividendSummary(figureFilters(state, undefined))),
    orNull(readReceipts(figureQuery)),
    orNull(fetchByInstrument(BY_INSTRUMENT_YEARS, state.ipage, BY_INSTRUMENT_SIZE)),
    orNull(fetchBrokers()),
    state.instrument ? orNull(fetchInstrument(state.instrument)) : Promise.resolve(null),
  ]);

  if (!list.ok) return <LoansLoadError what="dividends" reference={list.reference} />;
  const page = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= page.totalPages && page.totalPages > 0) {
    redirect(dividendsUrl({ ...state, page: page.totalPages - 1 }));
  }
  if (byInstrument && state.ipage > 0 && state.ipage >= byInstrument.totalPages && byInstrument.totalPages > 0) {
    redirect(dividendsUrl({ ...state, ipage: byInstrument.totalPages - 1 }));
  }

  const receipts = receiptsAndNames?.receipts ?? null;
  const names = receiptsAndNames?.names ?? {};

  const totals = fyTotals(summary, fy);
  const figures = dividendsFigures(fy, totals, receipts, names);
  const footer = listTotals(state, totals, receipts, page.content, page.totalElements);

  return (
    <DividendsView
      state={state}
      figures={figures}
      dividends={page.content}
      rows={page.content.map(dividendListRow)}
      totalElements={page.totalElements}
      totalPages={page.totalPages}
      fyOptions={fyOptions(summary, fy, currentFy)}
      fyValue={fy === undefined ? 'all' : String(fy)}
      currentFy={currentFy}
      brokers={(brokers ?? []).map((b) => ({ id: b.id, name: b.name }))}
      instrumentLabel={instrument ? instrument.symbol || instrument.name : null}
      totalsLine={footer ? totalsLine(footer) : null}
      exportFilters={filters}
      byInstrument={{
        rows: (byInstrument?.items ?? []).map(byInstrumentRow),
        page: state.ipage,
        totalElements: byInstrument?.totalElements ?? 0,
        totalPages: byInstrument?.totalPages ?? 0,
      }}
      today={today}
    />
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds';
import { FnoHero, FnoTiles, MonthCard, UnderlyingCard } from '@/features/investments/fno/FnoFigures';
import { FnoListCard } from '@/features/investments/fno/FnoListCard';
import {
  figuresModel,
  fnoQuery,
  fnoUrl,
  IMPORT_STATEMENT_HREF,
  monthRows,
  parseFnoUrl,
  underlyingRows,
} from '@/features/investments/fno/fnoModel';
import { fetchFnoPage, fetchFnoSummary } from '@/features/investments/fno/fnoServerApi';
import { fyLabel } from '@/features/investments/investmentsFormat';
import { fetchBrokers } from '@/features/investments/investmentsServerApi';
import { LoansLoadError } from '@/features/loans/LoansLoadError';
import { loaded, orNull } from '@/features/shell/loadHelpers';

type SearchParams = { q?: string; contract?: string; broker?: string; fy?: string; sort?: string; page?: string; size?: string };

/** /ds/investments/fno: F&O. The filters, FY, sort and page are in the URL and answered by the server. */
export default async function DsFnoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = parseFnoUrl(await searchParams);
  const [list, summary, brokers] = await Promise.all([
    loaded(fetchFnoPage(fnoQuery(state))),
    orNull(fetchFnoSummary({ fy: state.fy, brokerAccountId: state.broker || undefined })),
    orNull(fetchBrokers()),
  ]);

  if (!list.ok) return <LoansLoadError what="F&O trades" reference={list.reference} />;
  const { content, totalElements, totalPages } = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= totalPages && totalPages > 0) {
    redirect(fnoUrl({ ...state, page: totalPages - 1 }));
  }

  const figures = summary ? figuresModel(summary) : null;
  const months = summary ? monthRows(summary) : [];
  const underlyings = summary ? underlyingRows(summary) : [];

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <Button asChild variant="secondary" className="max-desk:w-full desk:self-end">
        <Link href={IMPORT_STATEMENT_HREF}>Import statement</Link>
      </Button>
      {figures ? <FnoHero figures={figures} /> : null}
      <FnoTiles figures={figures} />
      <FnoListCard
        state={state}
        trades={content}
        totalElements={totalElements}
        totalPages={totalPages}
        brokers={(brokers ?? []).map((b) => ({ id: b.id, name: b.name, clientId: b.clientId }))}
        summary={summary}
      />
      {months.length > 0 || underlyings.length > 0 ? (
        <div className="grid grid-cols-1 desk:grid-cols-2 items-start gap-space-12 desk:gap-space-16">
          {months.length > 0 ? <MonthCard rows={months} fy={fyLabel(state.fy)} /> : null}
          {underlyings.length > 0 ? <UnderlyingCard rows={underlyings} /> : null}
        </div>
      ) : null}
    </div>
  );
}

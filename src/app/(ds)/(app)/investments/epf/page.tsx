import { redirect } from 'next/navigation';
import React from 'react';

import {
  effectiveEmployer,
  effectiveFy,
  employerRow,
  epfFigures,
  epfRow,
  epfUrl,
  fyOptions,
  missingMonths,
  parseEpfUrl,
  passbookSubtitle,
} from '@/features/investments/epf/epfModel';
import { fetchEpfEmployers, fetchEpfEntries, fetchEpfFys, fetchEpfSummary } from '@/features/investments/epf/epfServerApi';
import { EpfView } from '@/features/investments/epf/EpfView';
import { LoansLoadError } from '@/features/loans/LoansLoadError';
import { loaded, orNull } from '@/features/shell/loadHelpers';
import { todayInAppZone } from '@/lib/date-range';

type SearchParams = { fy?: string; employer?: string; page?: string; size?: string };

/** /investments/epf. The FY, employer and page are in the URL and answered by the server. */
export default async function DsEpfPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = parseEpfUrl(await searchParams);
  const today = todayInAppZone();

  const [summary, employers] = await Promise.all([loaded(fetchEpfSummary()), loaded(fetchEpfEmployers())]);
  if (!summary.ok) return <LoansLoadError what="EPF" reference={summary.reference} />;
  if (!employers.ok) return <LoansLoadError what="EPF" reference={employers.reference} />;
  const employer = effectiveEmployer(state, employers.data);

  const fys = (await orNull(fetchEpfFys(employer?.id))) ?? [];
  const fy = effectiveFy(state, fys);
  const list = await loaded(fetchEpfEntries({ employerId: employer?.id, fy, page: state.page, size: state.size }));
  if (!list.ok) return <LoansLoadError what="EPF" reference={list.reference} />;
  const page = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= page.totalPages && page.totalPages > 0) {
    redirect(epfUrl({ ...state, page: page.totalPages - 1 }));
  }

  const staleThrough = summary.data.staleThrough ?? null;
  const multiple = employers.data.length > 1;

  return (
    <EpfView
      state={state}
      summary={summary.data}
      figures={epfFigures(summary.data)}
      entries={page.content}
      rows={page.content.map((e) => epfRow(e))}
      totalElements={page.totalElements}
      totalPages={page.totalPages}
      subtitle={passbookSubtitle(employer, summary.data.uanLast4, employers.data.length)}
      fyOptions={fyOptions(fys, fy)}
      fyValue={fy === undefined ? 'all' : String(fy)}
      employers={employers.data}
      employerRows={employers.data.map(employerRow)}
      employerOptions={multiple ? [{ value: 'all', label: 'All employers' }, ...employers.data.map((e) => ({ value: e.id, label: e.name }))] : []}
      employerValue={employer?.id ?? 'all'}
      stale={staleThrough ? { through: staleThrough, missing: missingMonths(staleThrough, today) } : null}
      latestContribution={summary.data.latestContribution ?? null}
    />
  );
}

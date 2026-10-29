import { redirect } from 'next/navigation';

import { type Loaded, loaded, orNull } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';
import { todayInAppZone } from '@/lib/date-range';

import {
  effectiveEmployer,
  effectiveFy,
  employerRow,
  epfFigures,
  epfRow,
  epfUrl,
  type EpfUrlState,
  fyOptions,
  missingMonths,
  passbookSubtitle,
} from './epfModel';
import { fetchEpfEmployers, fetchEpfEntries, fetchEpfFys, fetchEpfSummary } from './epfServerApi';
import type { EpfViewProps } from './EpfView';

/** What the EPF view shows for the address's FY, employer and page. A page past the end redirects to the last one. */
export async function loadEpfScreen(state: EpfUrlState): Promise<Loaded<EpfViewProps>> {
  const today = todayInAppZone();

  const [summary, employers] = await Promise.all([loaded(fetchEpfSummary()), loaded(fetchEpfEmployers())]);
  if (!summary.ok) return summary;
  if (!employers.ok) return employers;
  const employer = effectiveEmployer(state, employers.data);

  const fys = (await orNull(fetchEpfFys(employer?.id))) ?? [];
  const fy = effectiveFy(state, fys);
  const list = await loaded(fetchEpfEntries({ employerId: employer?.id, fy, page: state.page, size: state.size }));
  if (!list.ok) return list;
  const page = list.data;
  // A page past the end (a stale address) shows the last page instead of an empty one.
  if (state.page > 0 && state.page >= page.totalPages && page.totalPages > 0) {
    redirect(epfUrl({ ...state, page: clampPage(state.page, page.totalPages) }));
  }

  const staleThrough = summary.data.staleThrough ?? null;
  const multiple = employers.data.length > 1;

  return {
    ok: true,
    data: {
      state,
      summary: summary.data,
      figures: epfFigures(summary.data),
      entries: page.content,
      rows: page.content.map((e) => epfRow(e)),
      totalElements: page.totalElements,
      totalPages: page.totalPages,
      subtitle: passbookSubtitle(employer, summary.data.uanLast4, employers.data.length),
      fyOptions: fyOptions(fys, fy),
      fyValue: fy === undefined ? 'all' : String(fy),
      employers: employers.data,
      employerRows: employers.data.map(employerRow),
      employerOptions: multiple ? [{ value: 'all', label: 'All employers' }, ...employers.data.map((e) => ({ value: e.id, label: e.name }))] : [],
      employerValue: employer?.id ?? 'all',
      stale: staleThrough ? { through: staleThrough, missing: missingMonths(staleThrough, today) } : null,
      latestContribution: summary.data.latestContribution ?? null,
    },
  };
}

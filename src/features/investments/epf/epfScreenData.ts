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
import type { EpfScreenProps } from './EpfScreen';
import { fetchEpfEmployers, fetchEpfEntries, fetchEpfFys, fetchEpfSummary } from './epfServerApi';

/** What the EPF view shows for the address's FY, employer and page. A page past the end redirects to the last one. */
export async function loadEpfScreen(state: EpfUrlState): Promise<Loaded<EpfScreenProps>> {
  const today = todayInAppZone();

  // The employer is known up front only for 'all'; the FY only when the address names it. What is known starts with
  // the summary and the employers (a failure there is still reported first, below, as before).
  const early = <T,>(request: Promise<T>): Promise<T> => {
    request.catch(() => undefined);
    return request;
  };
  const fyKnown = state.fy !== null;
  const entriesFor = (employerId: string | undefined, fy: number | undefined) =>
    loaded(fetchEpfEntries({ employerId, fy, page: state.page, size: state.size }));
  const employerKnown = state.employer === 'all';
  const earlyFys = employerKnown ? early(orNull(fetchEpfFys(undefined))) : null;
  const earlyEntries = employerKnown && fyKnown ? early(entriesFor(undefined, effectiveFy(state, []))) : null;

  const [summary, employers] = await Promise.all([loaded(fetchEpfSummary()), loaded(fetchEpfEmployers())]);
  if (!summary.ok) return summary;
  if (!employers.ok) return employers;
  const employer = effectiveEmployer(state, employers.data);

  // Past the employers: the FY list and, when the address names the FY, the entries need nothing from each other.
  const fysRequest = earlyFys ?? early(orNull(fetchEpfFys(employer?.id)));
  const entriesRequest = earlyEntries ?? (fyKnown ? early(entriesFor(employer?.id, effectiveFy(state, []))) : null);
  const fys = (await fysRequest) ?? [];
  const fy = effectiveFy(state, fys);
  const list = await (entriesRequest ?? entriesFor(employer?.id, fy));
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

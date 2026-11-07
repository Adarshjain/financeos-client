import { type Loaded, loaded } from '@/features/shell/loadHelpers';

import { fetchEpfEmployers, fetchEpfSummary } from '../epf/epfServerApi';
import { fetchNpsSummary } from '../nps/npsServerApi';
import { type RetirementModel, retirementModel } from './retirementModel';

/** What the Retirement overview shows: the EPF summary and the NPS summary, the same loaders their own screens use. */
export async function loadRetirementScreen(): Promise<Loaded<RetirementModel>> {
  const [epf, employers, nps] = await Promise.all([loaded(fetchEpfSummary()), loaded(fetchEpfEmployers()), loaded(fetchNpsSummary())]);
  if (!epf.ok) return epf;
  if (!employers.ok) return employers;
  if (!nps.ok) return nps;
  return { ok: true, data: retirementModel(epf.data, employers.data, nps.data) };
}

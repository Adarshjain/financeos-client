import { type Loaded, loaded } from '@/features/shell/loadHelpers';

import { fetchEpfEmployers, fetchEpfSummary } from '../epf/epfServerApi';
import { fetchNpsSummary } from '../nps/npsServerApi';
import { type RetirementModel, retirementModel } from './retirementModel';

/**
 * What the Retirement overview shows: the EPF summary + employers and the NPS summary, the same loaders their own screens use.
 * EPF and NPS load independently: a model with the part that loaded and `failed` for the one that did not.
 * Only when both fail is the result a failure (the first one's reference).
 */
export async function loadRetirementScreen(): Promise<Loaded<RetirementModel>> {
  const [epf, employers, nps] = await Promise.all([loaded(fetchEpfSummary()), loaded(fetchEpfEmployers()), loaded(fetchNpsSummary())]);
  const epfFailure = !epf.ok ? epf : !employers.ok ? employers : null;
  const npsFailure = !nps.ok ? nps : null;
  if (epfFailure && npsFailure) return { ok: false, reference: epfFailure.reference ?? npsFailure.reference };
  const model = retirementModel(
    epf.ok && employers.ok ? epf.data : null,
    employers.ok ? employers.data : null,
    nps.ok ? nps.data : null,
    {
      epf: epfFailure ? { reference: epfFailure.reference } : undefined,
      nps: npsFailure ? { reference: npsFailure.reference } : undefined,
    },
  );
  return { ok: true, data: model };
}

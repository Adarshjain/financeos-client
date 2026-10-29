'use server';

import { epfApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

import type { EpfEmployer, EpfLatestContribution } from './epfModel';

export interface EpfFormOptions {
  employers: EpfEmployer[];
  /** The newest contribution, which a new contribution is filled from. */
  latestContribution: EpfLatestContribution | null;
}

/** The employers and the newest contribution the add form starts from. */
export const loadEpfFormOptions = createDomainAction(
  { fallbackError: "Couldn't load the employers. Try again." },
  async (): Promise<EpfFormOptions> => {
    const [employers, summary] = await Promise.all([epfApi.employers(), epfApi.summary()]);
    return { employers, latestContribution: summary.latestContribution ?? null };
  },
);

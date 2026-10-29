'use server';

import type { CreateCorporateActionRequest } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type { CorporateActionPreview } from '@/lib/investments.types';

import { fetchCorporateActionPreview } from './corporateActionsServerApi';

/** The effect of recording the action, rolled back on the server. */
export const loadCorporateActionPreview = createDomainAction(
  { fallbackError: "Couldn't preview the corporate action. Try again." },
  async (instrumentId: string, body: CreateCorporateActionRequest & { excludeActionId?: string }): Promise<CorporateActionPreview> =>
    fetchCorporateActionPreview(instrumentId, body),
);

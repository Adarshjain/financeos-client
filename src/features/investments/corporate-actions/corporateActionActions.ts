'use server';

import { serverApi } from '@/lib/api/server';
import type { CorporateAction, CreateCorporateActionRequest, UpdateCorporateActionRequest } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type { CorporateActionPreview } from '@/lib/investments.types';

import { fetchCorporateActionPreview } from './corporateActionsServerApi';

/** The effect of recording the action, rolled back on the server. */
export const loadCorporateActionPreview = createDomainAction(
  { fallbackError: "Couldn't preview the corporate action. Try again." },
  async (instrumentId: string, body: CreateCorporateActionRequest & { excludeActionId?: string }): Promise<CorporateActionPreview> =>
    fetchCorporateActionPreview(instrumentId, body),
);

/** Records a corporate action on an instrument. */
export const createCorporateAction = createDomainAction(
  { fallbackError: "Couldn't save the corporate action. Try again." },
  async (instrumentId: string, body: CreateCorporateActionRequest): Promise<CorporateAction> => {
    const { data } = await serverApi.POST('/api/v1/instruments/{instrumentId}/corporate-actions', { params: { path: { instrumentId } }, body });
    return data! as CorporateAction;
  },
);

/** Changes a corporate action. */
export const updateCorporateAction = createDomainAction(
  { fallbackError: "Couldn't save the corporate action. Try again." },
  async (instrumentId: string, id: string, body: UpdateCorporateActionRequest): Promise<CorporateAction> => {
    const { data } = await serverApi.PUT('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', { params: { path: { instrumentId, id } }, body });
    return data! as CorporateAction;
  },
);

/** Deletes a corporate action. */
export const deleteCorporateAction = createDomainAction(
  { fallbackError: "Couldn't delete the corporate action. Try again." },
  async (instrumentId: string, id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', { params: { path: { instrumentId, id } } });
  },
);

'use server';

import { serverApi } from '@/lib/api/server';
import type { CorporateAction, CorporateActionSuggestion, CreateCorporateActionRequest, UpdateCorporateActionRequest } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type { CorporateActionPreview } from '@/lib/investments.types';
import { action } from '@/lib/observability/action';

import { fetchCorporateActionPreview } from './corporateActionsServerApi';

/** The effect of recording the action, rolled back on the server. */
export const loadCorporateActionPreview = action('corporateAction.loadCorporateActionPreview', createDomainAction(
  { fallbackError: "Couldn't preview the corporate action. Try again." },
  async (instrumentId: string, body: CreateCorporateActionRequest & { excludeActionId?: string }): Promise<CorporateActionPreview> =>
    fetchCorporateActionPreview(instrumentId, body),
));

/** Records a corporate action on an instrument. */
export const createCorporateAction = action('corporateAction.createCorporateAction', createDomainAction(
  { fallbackError: "Couldn't save the corporate action. Try again." },
  async (instrumentId: string, body: CreateCorporateActionRequest): Promise<CorporateAction> => {
    const { data } = await serverApi.POST('/api/v1/instruments/{instrumentId}/corporate-actions', { params: { path: { instrumentId } }, body });
    return data! as CorporateAction;
  },
));

/** Changes a corporate action. */
export const updateCorporateAction = action('corporateAction.updateCorporateAction', createDomainAction(
  { fallbackError: "Couldn't save the corporate action. Try again." },
  async (instrumentId: string, id: string, body: UpdateCorporateActionRequest): Promise<CorporateAction> => {
    const { data } = await serverApi.PUT('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', { params: { path: { instrumentId, id } }, body });
    return data! as CorporateAction;
  },
));

/** Deletes a corporate action. */
export const deleteCorporateAction = action('corporateAction.deleteCorporateAction', createDomainAction(
  { fallbackError: "Couldn't delete the corporate action. Try again." },
  async (instrumentId: string, id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', { params: { path: { instrumentId, id } } });
  },
));

/** A detected corporate action, for the review dialog. */
export const loadCorporateActionSuggestion = action('corporateAction.loadCorporateActionSuggestion', createDomainAction(
  { fallbackError: "Couldn't open this corporate action. Try again." },
  async (id: string): Promise<CorporateActionSuggestion> => {
    const { data } = await serverApi.GET('/api/v1/corporate-action-suggestions/{id}', { params: { path: { id } } });
    return data! as CorporateActionSuggestion;
  },
));

/** Takes an automatically applied corporate action back. */
export const undoCorporateActionSuggestion = action('corporateAction.undoCorporateActionSuggestion', createDomainAction(
  { fallbackError: "Couldn't remove the corporate action. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.POST('/api/v1/corporate-action-suggestions/{id}/undo', { params: { path: { id } } });
  },
));

/** Records a pending suggestion as the corporate action in the request. */
export const acceptCorporateActionSuggestion = action('corporateAction.acceptCorporateActionSuggestion', createDomainAction(
  { fallbackError: "Couldn't save the corporate action. Try again." },
  async (id: string, body: CreateCorporateActionRequest): Promise<void> => {
    await serverApi.POST('/api/v1/corporate-action-suggestions/{id}/accept', { params: { path: { id } }, body });
  },
));

/** "Ignore": drops a pending suggestion. */
export const dismissCorporateActionSuggestion = action('corporateAction.dismissCorporateActionSuggestion', createDomainAction(
  { fallbackError: "Couldn't update this suggestion. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.POST('/api/v1/corporate-action-suggestions/{id}/dismiss', { params: { path: { id } } });
  },
));

/** An instrument by id, as the corporate-action dialog's instrument. */
export const loadInstrumentRef = action('corporateAction.loadInstrumentRef', createDomainAction(
  { fallbackError: "Couldn't open this instrument. Try again." },
  async (id: string): Promise<{ id: string; name: string; symbol: string | null }> => {
    const { data } = await serverApi.GET('/api/v1/instruments/{id}', { params: { path: { id } } });
    return { id, name: data!.name, symbol: data!.symbol ?? null };
  },
));

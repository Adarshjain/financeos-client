'use server';

import { serverApi } from '@/lib/api/server';
import type { CreateLlmKeyRequest, LlmRoutingGroupDto, Schemas } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

type RoutingEntryRequest = Schemas['RoutingEntryRequest'];
type TestModelRequest = Schemas['TestModelRequest'];
type RoutingGroup = 'chat' | 'default';

export const loadLlmKeys = action('llm.loadLlmKeys', createDomainAction(
  { fallbackError: "Couldn't load the AI settings. Try again." },
  async () => (await serverApi.GET('/api/v1/llm-keys')).data ?? [],
));

export const loadLlmCatalog = action('llm.loadLlmCatalog', createDomainAction(
  { fallbackError: "Couldn't load the AI settings. Try again." },
  async () => (await serverApi.GET('/api/v1/llm/catalog')).data ?? [],
));

export const loadLlmRoutingOptions = action('llm.loadLlmRoutingOptions', createDomainAction(
  { fallbackError: "Couldn't load the AI settings. Try again." },
  async () => (await serverApi.GET('/api/v1/llm/routing-options')).data ?? [],
));

export const loadLlmRouting = action('llm.loadLlmRouting', createDomainAction(
  { fallbackError: "Couldn't load the AI settings. Try again." },
  async () => (await serverApi.GET('/api/v1/llm/routing')).data ?? null,
));

export const loadLlmHealth = action('llm.loadLlmHealth', createDomainAction(
  { fallbackError: "Couldn't load the AI settings. Try again." },
  async () => (await serverApi.GET('/api/v1/llm/health')).data ?? [],
));

export const createLlmKey = action('llm.createLlmKey', createDomainAction(
  { fallbackError: "Couldn't add the API key. Try again." },
  async (body: CreateLlmKeyRequest) => (await serverApi.POST('/api/v1/llm-keys', { body })).data!,
));

export const deleteLlmKey = action('llm.deleteLlmKey', createDomainAction(
  { fallbackError: "Couldn't delete the API key. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/llm-keys/{id}', { params: { path: { id } } });
  },
));

/** The reordered keys of the moved key's provider. */
export const updateLlmKeyPosition = action('llm.updateLlmKeyPosition', createDomainAction(
  { fallbackError: "Couldn't reorder the keys. Try again." },
  async (id: string, position: number) =>
    (await serverApi.PATCH('/api/v1/llm-keys/{id}/position', { params: { path: { id } }, body: { position } })).data!,
));

export const testLlmKey = action('llm.testLlmKey', createDomainAction(
  { fallbackError: "Couldn't verify the key. Try again." },
  async (id: string, model?: string) =>
    (await serverApi.POST('/api/v1/llm-keys/{id}/test', { params: { path: { id } }, body: { model } })).data!,
));

export const saveLlmRouting = action('llm.saveLlmRouting', createDomainAction(
  { fallbackError: "Couldn't save routing. Try again." },
  async (group: RoutingGroup, entries: RoutingEntryRequest[]): Promise<LlmRoutingGroupDto> =>
    (await serverApi.PUT('/api/v1/llm/routing/{group}', { params: { path: { group } }, body: { entries } })).data!,
));

export const resetLlmRouting = action('llm.resetLlmRouting', createDomainAction(
  { fallbackError: "Couldn't reset routing. Try again." },
  async (group: RoutingGroup): Promise<LlmRoutingGroupDto> =>
    (await serverApi.POST('/api/v1/llm/routing/{group}/reset', { params: { path: { group } } })).data!,
));

export const testLlmModel = action('llm.testLlmModel', createDomainAction(
  { fallbackError: "Couldn't test the model. Try again." },
  async (body: TestModelRequest) => (await serverApi.POST('/api/v1/llm/routing/test-model', { body })).data!,
));

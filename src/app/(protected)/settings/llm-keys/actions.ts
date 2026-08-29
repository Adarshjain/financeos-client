'use server';

import { llmKeysApi, llmRoutingApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { CreateLlmKeyRequest, UpdateRoutingRequest } from '@/lib/llmKey.types';

const SETTINGS_LLM_KEYS_PATH = '/settings/llm-keys';

export const listLlmKeys = createDomainAction(
  { fallbackError: 'Failed to fetch AI API keys' },
  () => llmKeysApi.list()
);

export const createLlmKey = createDomainAction(
  { fallbackError: 'Failed to create AI API key', revalidatePaths: [SETTINGS_LLM_KEYS_PATH] },
  (data: CreateLlmKeyRequest) => llmKeysApi.create(data)
);

export const deleteLlmKey = createDomainAction(
  { fallbackError: 'Failed to delete AI API key', revalidatePaths: [SETTINGS_LLM_KEYS_PATH] },
  (id: string) => llmKeysApi.delete(id)
);

export const updateLlmKeyPosition = createDomainAction(
  { fallbackError: 'Failed to update key position', revalidatePaths: [SETTINGS_LLM_KEYS_PATH] },
  (id: string, position: number) => llmKeysApi.updatePosition(id, position)
);

export const testLlmKey = createDomainAction(
  { fallbackError: 'Failed to test key completion' },
  (id: string, model?: string) => llmKeysApi.test(id, model)
);

export const getLlmTaskGroups = createDomainAction(
  { fallbackError: 'Failed to fetch LLM task groups' },
  () => llmRoutingApi.getTaskGroups()
);

export const getLlmCatalog = createDomainAction(
  { fallbackError: 'Failed to fetch LLM model catalog' },
  () => llmRoutingApi.getCatalog()
);

export const getLlmRoutingOptions = createDomainAction(
  { fallbackError: 'Failed to fetch LLM routing options' },
  () => llmRoutingApi.getRoutingOptions()
);

export const getLlmRouting = createDomainAction(
  { fallbackError: 'Failed to fetch LLM routing preferences' },
  () => llmRoutingApi.getRouting()
);

export const updateLlmRouting = createDomainAction(
  { fallbackError: 'Failed to update LLM routing preferences', revalidatePaths: [SETTINGS_LLM_KEYS_PATH] },
  (group: string, data: UpdateRoutingRequest) => llmRoutingApi.updateRouting(group, data)
);

export const resetLlmRouting = createDomainAction(
  { fallbackError: 'Failed to reset LLM routing preferences', revalidatePaths: [SETTINGS_LLM_KEYS_PATH] },
  (group: string) => llmRoutingApi.resetRouting(group)
);

export const getLlmHealth = createDomainAction(
  { fallbackError: 'Failed to fetch LLM routing health' },
  () => llmRoutingApi.getHealth()
);

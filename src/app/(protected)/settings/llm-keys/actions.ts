'use server';

import { llmKeysApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { CreateLlmKeyRequest } from '@/lib/llmKey.types';

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

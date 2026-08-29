export type LlmKeyStatus = 'ACTIVE' | 'INVALID';

export interface LlmKeyDto {
  id: string;
  provider: string;
  label?: string;
  keyLast4: string;
  status: LlmKeyStatus;
  position: number;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateLlmKeyRequest {
  provider: string;
  key: string;
  label?: string;
}

export interface UpdateLlmKeyPositionRequest {
  position: number;
}

export interface LlmTaskGroupDto {
  code: string;
  displayName: string;
  description: string;
}

export interface ModelCatalogEntryDto {
  id: string;
  label: string;
  structuredOutput?: string;
  free: boolean;
  trainsOnData: 'no' | 'yes' | 'unknown' | string;
  notes?: string;
}

export interface ProviderCatalogDto {
  id: string;
  name: string;
  type: string;
  defaultModel?: string;
  models: ModelCatalogEntryDto[];
}

export interface RoutingOptionDto {
  id: string;
  label: string;
  provider: string;
  providerName: string;
  model?: string;
  notes?: string;
  free: boolean;
  trainsOnData: 'no' | 'yes' | 'unknown' | string;
  available: boolean;
}

export interface RoutingEntryDto {
  position: number;
  optionId: string;
  optionLabel: string;
  provider: string;
  providerName: string;
  model?: string;
  hasKey: boolean;
}

export interface LlmRoutingGroupDto {
  group: string;
  displayName: string;
  description: string;
  usingDefaults: boolean;
  entries: RoutingEntryDto[];
}

export interface LlmRoutingDto {
  chat: LlmRoutingGroupDto;
  default: LlmRoutingGroupDto;
}

export interface RoutingEntryRequest {
  optionId: string;
}

export interface UpdateRoutingRequest {
  entries: RoutingEntryRequest[];
}

export interface LlmBucketHealthDto {
  provider: string;
  providerName: string;
  model: string;
  modelLabel: string;
  keyLast4?: string;
  keyLabel?: string;
  inCooldown: boolean;
  cooldownUntil?: string | null;
  consecutiveFailures: number;
}

export interface TestKeyResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

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

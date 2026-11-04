import type { ApiClient } from './api';
import { expectStatus } from './api';

export interface ScriptResponseEntry {
  json?: unknown;
  error?: {
    kind: string;
    message: string;
  };
  delayMs?: number;
  /**
   * Keys the entry to prompts containing this text instead of FIFO order. Use it whenever the
   * server drains work in an order the test cannot control (the Gmail sync processes a discovery
   * pass's messages in random order), e.g. `promptContains: 'Subject: Debit alert ...'`.
   */
  promptContains?: string;
}

export interface CallEntry {
  task: string;
  userId: string;
  prompt: string;
  schemaPresent: boolean;
  timestamp: string;
}

export interface CoverageHit {
  method: string;
  pattern: string;
  ok: number;
  clientError: number;
  serverError: number;
}

export async function scriptLlm(
  api: ApiClient,
  task: string,
  responses: ScriptResponseEntry[]
): Promise<{ queued: Record<string, number> }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).POST('/api/e2e/llm/script', {
    body: { task, responses },
  });
  expectStatus(res, 200);
  return res.data;
}

export async function llmCalls(
  api: ApiClient,
  task?: string
): Promise<CallEntry[]> {
  const query = task ? `?task=${encodeURIComponent(task)}` : '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).GET(`/api/e2e/llm/calls${query}`);
  expectStatus(res, 200);
  return res.data.calls;
}

export async function resetLlm(api: ApiClient): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).DELETE('/api/e2e/llm');
  expectStatus(res, 204);
}

export async function setLlmMode(
  api: ApiClient,
  mode: string
): Promise<{ mode: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).PUT('/api/e2e/llm/mode', {
    body: { mode },
  });
  expectStatus(res, 200);
  return res.data;
}

export async function coverage(
  api: ApiClient
): Promise<{ hits: CoverageHit[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).GET('/api/e2e/coverage');
  expectStatus(res, 200);
  return res.data;
}

export async function resetCoverage(api: ApiClient): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).POST('/api/e2e/coverage/reset');
  expectStatus(res, 204);
}

export interface AccountDetectSeedEntity {
  /** The server BankDirectory issuer id, e.g. "hdfc", "axis". */
  bank: string;
  last4: string;
  kind: 'ACCOUNT' | 'CREDIT_CARD' | 'DEBIT_CARD';
  existsConf: 'HIGH' | 'MEDIUM' | 'LOW';
  kindConf: 'HIGH' | 'MEDIUM' | 'LOW';
  variant?: string;
  variantConf?: 'HIGH' | 'MEDIUM' | 'LOW';
  variantCandidates?: string[];
  lifecycle?: string;
  lifecycleConf?: 'HIGH' | 'MEDIUM' | 'LOW';
  /** The parent entity's key, for a card that belongs to an account. */
  linkedTo?: string;
  first?: string;
  last?: string;
  evidenceMails?: number;
  limitBucket?: string;
  limitConf?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AccountDetectSeedScan {
  status: 'IDLE' | 'RUNNING' | 'PAUSED_AUTH' | 'FAILED';
  mailsSeen: number;
  mailsTotal: number;
  firstScanDone: boolean;
}

/** Seeds the current user's account suggestions (and optionally the scan state) as if the detect job had just run. */
export async function seedAccountDetect(
  api: ApiClient,
  body: { entities: AccountDetectSeedEntity[]; scan?: AccountDetectSeedScan }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).POST('/api/e2e/account-detect/seed', { body });
  expectStatus(res, 204);
}

/** Clears the current user's suggestions and scan state. */
export async function clearAccountDetect(api: ApiClient): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).DELETE('/api/e2e/account-detect');
  expectStatus(res, 204);
}

/** Runs recurring-payment detection for the current user now (synchronous), instead of waiting for the daily job. */
export async function detectRecurring(api: ApiClient): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).POST('/api/e2e/recurring/detect');
  expectStatus(res, 204);
}

/** Moves an account's creation `days` into the past, so rules that need an account of a certain age apply to it. */
export async function ageAccount(api: ApiClient, accountId: string, days: number): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).POST(`/api/e2e/accounts/${accountId}/age`, { body: { days } });
  expectStatus(res, 204);
}

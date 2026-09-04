import type { ApiClient } from './api';
import { expectStatus } from './api';

export interface ScriptResponseEntry {
  json?: unknown;
  error?: {
    kind: string;
    message: string;
  };
  delayMs?: number;
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

import { expect } from '@playwright/test';
import createFetchClient, { type Client } from 'openapi-fetch';

import type { components, paths } from '../../src/lib/api/schema.d.ts';
import { E2E_API_URL } from './config';

export type ApiClient = Client<paths, `${string}/${string}`>;
export type JobResponse = components['schemas']['JobResponse'];

export function makeApi(cookie?: string): ApiClient {
  const headers: Record<string, string> = {};
  if (cookie) {
    headers['Cookie'] = `FINANCEOS_SESSION=${cookie}`;
  }
  return createFetchClient<paths>({
    baseUrl: E2E_API_URL,
    headers,
  });
}

export function expectStatus<T extends { response: Response; error?: unknown }>(
  res: T,
  expectedStatus: number
): void {
  expect(
    res.response.status,
    `Expected status ${expectedStatus} but got ${res.response.status}. Error: ${JSON.stringify(res.error)}`
  ).toBe(expectedStatus);
}

export interface WaitForJobOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export async function waitForJob(
  api: ApiClient,
  jobId: string,
  options: WaitForJobOptions = {}
): Promise<JobResponse> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const pollIntervalMs = options.pollIntervalMs ?? 500;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const res = await api.GET('/api/v1/jobs/{id}', {
      params: { path: { id: jobId } },
    });
    expectStatus(res, 200);
    const job = res.data!;
    const terminalStatuses: JobResponse['status'][] = [
      'SUCCEEDED',
      'FAILED',
      'CANCELLED',
    ];
    if (terminalStatuses.includes(job.status)) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timeout after ${timeoutMs}ms waiting for job ${jobId} to reach terminal status`);
}

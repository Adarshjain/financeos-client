import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { request } from '@playwright/test';

import { makeApi } from './fixtures/api';
import { createUser } from './fixtures/auth';
import { E2E_API_URL, E2E_CLIENT_URL } from './fixtures/config';
import { resetCoverage, resetLlm } from './fixtures/control';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkUrl(url: string, timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        return true;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export default async function globalSetup(): Promise<void> {
  // 0. Clear routes-visited directory
  const routesVisitedDir = path.resolve(__dirname, './test-results/routes-visited');
  if (fs.existsSync(routesVisitedDir)) {
    fs.rmSync(routesVisitedDir, { recursive: true, force: true });
  }
  fs.mkdirSync(routesVisitedDir, { recursive: true });

  // 1. Wait for API health and client /login
  const apiHealthy = await checkUrl(`${E2E_API_URL}/actuator/health`, 5000);
  const clientHealthy = await checkUrl(`${E2E_CLIENT_URL}/login`, 5000);

  if (!apiHealthy || !clientHealthy) {
    const missing: string[] = [];
    if (!apiHealthy) missing.push(`API at ${E2E_API_URL}/actuator/health`);
    if (!clientHealthy) missing.push(`Client at ${E2E_CLIENT_URL}/login`);
    throw new Error(
      `E2E services not ready (${missing.join(', ')}). ` +
        `Please run "npm run e2e" or "bash e2e/run-local.sh --keep" to start the E2E stack.`
    );
  }

  // 2. Sign up a harness user
  const requestContext = await request.newContext();
  try {
    const harnessUser = await createUser(requestContext, 'harness');
    const api = makeApi(harnessUser.cookie);

    // 3. Reset coverage & LLM
    await resetCoverage(api);
    await resetLlm(api);
  } finally {
    await requestContext.dispose();
  }
}

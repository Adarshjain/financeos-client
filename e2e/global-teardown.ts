import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { request } from '@playwright/test';

import { evaluateGates } from './coverage/gate';
import { makeApi } from './fixtures/api';
import { createUser } from './fixtures/auth';
import { coverage, CoverageHit } from './fixtures/control';
import { findRequests, unmatchedCount } from './fixtures/google-stubs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchHits(): Promise<CoverageHit[]> {
  const requestContext = await request.newContext();
  try {
    const harnessUser = await createUser(requestContext, 'teardown-harness');
    const api = makeApi(harnessUser.cookie);
    const cov = await coverage(api);
    return cov.hits || [];
  } catch (err) {
    console.error('Failed to fetch coverage from API:', err);
    throw err;
  } finally {
    await requestContext.dispose();
  }
}

async function assertNoUnmatchedWireMock(): Promise<void> {
  const unmatched = await unmatchedCount();
  if (unmatched > 0) {
    throw new Error(`${unmatched} unmatched WireMock requests (GET ${process.env.E2E_WIREMOCK_URL ?? 'http://localhost:8089'}/__admin/requests/unmatched)`);
  }
}

export default async function globalTeardown(): Promise<void> {
  // Partial runs (--api/--browser/--ui) cannot satisfy the coverage gates, but every outbound call the
  // server made must still have hit a stub — that gate always runs.
  if (process.env.E2E_SKIP_GATES === '1') {
    console.log('[Coverage Gate] E2E_SKIP_GATES=1 is set. Skipping coverage gates (WireMock unmatched check still enforced).');
    await assertNoUnmatchedWireMock();
    return;
  }

  // One job of the sharded nightly run: its own server only saw part of the suite, so the gates run
  // later over every job's dump (e2e/coverage/merge-gate.ts). The stub check is per stack, so it runs here.
  if (process.env.E2E_COVERAGE_DUMP === '1') {
    await assertNoUnmatchedWireMock();
    const dumpDir = path.resolve(__dirname, './test-results/coverage');
    fs.mkdirSync(dumpDir, { recursive: true });
    fs.writeFileSync(path.join(dumpDir, 'hits.json'), JSON.stringify(await fetchHits()), 'utf8');
    console.log(`[Coverage Gate] E2E_COVERAGE_DUMP=1 is set. Wrote API hits to ${dumpDir}/hits.json; gates run after all jobs.`);
    return;
  }

  const hits = await fetchHits();
  const { summaryMd: gateMd, failureReasons } = evaluateGates(hits, [
    path.resolve(__dirname, './test-results/routes-visited'),
  ]);
  let summaryMd = gateMd;

  // WireMock: every outbound call the server made must have hit a stub. An unmatched request means
  // a stub is missing or a URL changed — either way the test that provoked it passed for the wrong
  // reason (or failed confusingly), so the whole run fails here.
  let unmatched = 0;
  let unmatchedLines: string[] = [];
  try {
    unmatched = await unmatchedCount();
    if (unmatched > 0) {
      const all = await findRequests({});
      unmatchedLines = all
        .filter((r) => (r as unknown as { wasMatched?: boolean }).wasMatched === false)
        .slice(0, 20)
        .map((r) => `- ${r.method} ${r.url}`);
    }
  } catch (e) {
    summaryMd += `## WireMock

Could not query WireMock: ${(e as Error).message}

`;
  }
  summaryMd += `## WireMock

Unmatched requests: **${unmatched}**

`;
  if (unmatchedLines.length > 0) {
    summaryMd += `### Unmatched Requests (Failure)
${unmatchedLines.join('\n')}

`;
  }

  const resultsDir = path.resolve(__dirname, './test-results');
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(path.join(resultsDir, 'coverage-summary.md'), summaryMd, 'utf8');

  console.log('\n================================================================');
  console.log(summaryMd);
  console.log('================================================================\n');

  if (unmatched > 0) {
    failureReasons.push(`${unmatched} unmatched WireMock requests`);
  }

  if (failureReasons.length > 0) {
    throw new Error(`Coverage gate failed: ${failureReasons.join('; ')}`);
  }
}

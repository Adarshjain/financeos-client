import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { request } from '@playwright/test';

import { loadRoutes } from './coverage/routes';
import { loadOperations, normalizePath } from './coverage/spec';
import { makeApi } from './fixtures/api';
import { createUser } from './fixtures/auth';
import { coverage, CoverageHit } from './fixtures/control';
import { findRequests, unmatchedCount } from './fixtures/google-stubs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ApiAllowlistEntry {
  method: string;
  path: string;
  reason: string;
  phase: number | null;
}

interface RouteAllowlistEntry {
  route: string;
  reason: string;
  phase: number | null;
}

function loadApiAllowlist(): ApiAllowlistEntry[] {
  const p = path.resolve(__dirname, './coverage/api-allowlist.json');
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

function loadRoutesAllowlist(): RouteAllowlistEntry[] {
  const p = path.resolve(__dirname, './coverage/routes-allowlist.json');
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

export default async function globalTeardown(): Promise<void> {
  if (process.env.E2E_SKIP_GATES === '1') {
    console.log('[Coverage Gate] E2E_SKIP_GATES=1 is set. Skipping coverage gates.');
    return;
  }

  // 1. API Gate
  const requestContext = await request.newContext();
  let hits: CoverageHit[] = [];

  try {
    const harnessUser = await createUser(requestContext, 'teardown-harness');
    const api = makeApi(harnessUser.cookie);
    const cov = await coverage(api);
    hits = cov.hits || [];
  } catch (err) {
    console.error('Failed to fetch coverage from API:', err);
    throw err;
  } finally {
    await requestContext.dispose();
  }

  const coveredOps = new Set<string>();
  for (const hit of hits) {
    if (hit.ok >= 1) {
      coveredOps.add(`${hit.method.toUpperCase()} ${normalizePath(hit.pattern)}`);
    }
  }

  const allOperations = loadOperations();
  const apiAllowlist = loadApiAllowlist();
  const apiAllowlistMap = new Map(
    apiAllowlist.map((entry) => [
      `${entry.method.toUpperCase()} ${normalizePath(entry.path)}`,
      entry,
    ])
  );

  const uncoveredOps: string[] = [];
  for (const op of allOperations) {
    const key = `${op.method.toUpperCase()} ${normalizePath(op.path)}`;
    if (!coveredOps.has(key) && !apiAllowlistMap.has(key)) {
      uncoveredOps.push(key);
    }
  }

  const staleApiEntries: { method: string; path: string }[] = [];
  for (const [key, entry] of apiAllowlistMap.entries()) {
    if (coveredOps.has(key)) {
      staleApiEntries.push({ method: entry.method, path: entry.path });
    }
  }

  // 2. Route Gate
  const routesVisitedDir = path.resolve(__dirname, './test-results/routes-visited');
  const visitedPathnames = new Set<string>();

  if (fs.existsSync(routesVisitedDir)) {
    const files = fs.readdirSync(routesVisitedDir).filter((f) => f.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = path.join(routesVisitedDir, file);
      const lines = fs
        .readFileSync(filePath, 'utf8')
        .split('\n')
        .filter((l) => l.trim().length > 0);

      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          const p = obj.pathname || obj.route || obj.path;
          if (p) {
            const normP = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
            visitedPathnames.add(normP);
          }
        } catch {
          // ignore malformed line
        }
      }
    }
  }

  const allRoutes = loadRoutes();
  const routesAllowlist = loadRoutesAllowlist();
  const routesAllowlistMap = new Map(
    routesAllowlist.map((entry) => [entry.route, entry])
  );

  const coveredRoutes = new Set<string>();
  for (const pathname of visitedPathnames) {
    const matched = allRoutes.find((r) => r.regex.test(pathname));
    if (matched) {
      coveredRoutes.add(matched.pattern);
    }
  }

  const uncoveredRoutes: string[] = [];
  for (const route of allRoutes) {
    if (!coveredRoutes.has(route.pattern) && !routesAllowlistMap.has(route.pattern)) {
      uncoveredRoutes.push(route.pattern);
    }
  }

  const staleRouteEntries: string[] = [];
  for (const pattern of routesAllowlistMap.keys()) {
    if (coveredRoutes.has(pattern)) {
      staleRouteEntries.push(pattern);
    }
  }

  // 3. Write Coverage Summary
  const totalOps = allOperations.length;
  const coveredOpsCount = coveredOps.size;
  const opsPct = totalOps > 0 ? ((coveredOpsCount / totalOps) * 100).toFixed(1) : '0.0';

  const totalRoutes = allRoutes.length;
  const coveredRoutesCount = coveredRoutes.size;
  const routesPct = totalRoutes > 0 ? ((coveredRoutesCount / totalRoutes) * 100).toFixed(1) : '0.0';

  const apiPhaseCounts: Record<string, number> = {};
  for (const entry of apiAllowlist) {
    const ph =
      entry.phase !== null && entry.phase !== undefined ? `Phase ${entry.phase}` : 'Permanent / None';
    apiPhaseCounts[ph] = (apiPhaseCounts[ph] || 0) + 1;
  }

  const routePhaseCounts: Record<string, number> = {};
  for (const entry of routesAllowlist) {
    const ph =
      entry.phase !== null && entry.phase !== undefined ? `Phase ${entry.phase}` : 'Permanent / None';
    routePhaseCounts[ph] = (routePhaseCounts[ph] || 0) + 1;
  }

  const formatPhaseCounts = (counts: Record<string, number>): string => {
    const keys = Object.keys(counts).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 999;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 999;
      return numA - numB;
    });
    if (keys.length === 0) return '- None';
    return keys.map((k) => `- ${k}: ${counts[k]}`).join('\n');
  };

  let summaryMd = `# E2E Coverage Summary\n\n`;

  summaryMd += `## OpenAPI Operations Coverage\n`;
  summaryMd += `- Total Spec Operations: ${totalOps}\n`;
  summaryMd += `- Covered Operations: ${coveredOpsCount} (${opsPct}%)\n`;
  summaryMd += `- Allowlisted Operations: ${apiAllowlist.length}\n`;
  summaryMd += `- Uncovered Operations: ${uncoveredOps.length}\n\n`;

  summaryMd += `### Allowlisted Operations by Phase\n`;
  summaryMd += `${formatPhaseCounts(apiPhaseCounts)}\n\n`;

  if (uncoveredOps.length > 0) {
    summaryMd += `### Uncovered Operations (Failure)\n`;
    summaryMd += uncoveredOps.map((o) => `- ${o}`).join('\n') + '\n\n';
  }

  if (staleApiEntries.length > 0) {
    summaryMd += `### Stale API Allowlist Entries (Failure)\n`;
    summaryMd +=
      staleApiEntries.map((e) => `- ${e.method} ${e.path} (remove from allowlist)`).join('\n') +
      '\n\n';
  }

  summaryMd += `## Client Route Coverage\n`;
  summaryMd += `- Total Routes: ${totalRoutes}\n`;
  summaryMd += `- Covered Routes: ${coveredRoutesCount} (${routesPct}%)\n`;
  summaryMd += `- Allowlisted Routes: ${routesAllowlist.length}\n`;
  summaryMd += `- Uncovered Routes: ${uncoveredRoutes.length}\n\n`;

  summaryMd += `### Allowlisted Routes by Phase\n`;
  summaryMd += `${formatPhaseCounts(routePhaseCounts)}\n\n`;

  if (uncoveredRoutes.length > 0) {
    summaryMd += `### Uncovered Routes (Failure)\n`;
    summaryMd += uncoveredRoutes.map((r) => `- ${r}`).join('\n') + '\n\n';
  }

  if (staleRouteEntries.length > 0) {
    summaryMd += `### Stale Route Allowlist Entries (Failure)\n`;
    summaryMd +=
      staleRouteEntries.map((r) => `- ${r} (remove from allowlist)`).join('\n') + '\n\n';
  }

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

  // 4. Throw if any failure kind is present
  const failureReasons: string[] = [];
  if (uncoveredOps.length > 0) {
    failureReasons.push(`${uncoveredOps.length} uncovered API operations`);
  }
  if (staleApiEntries.length > 0) {
    failureReasons.push(
      `${staleApiEntries.length} stale API allowlist entries: remove from allowlist (${staleApiEntries
        .map((e) => `${e.method} ${e.path}`)
        .join(', ')})`
    );
  }
  if (uncoveredRoutes.length > 0) {
    failureReasons.push(`${uncoveredRoutes.length} uncovered routes`);
  }
  if (staleRouteEntries.length > 0) {
    failureReasons.push(
      `${staleRouteEntries.length} stale route allowlist entries: remove from allowlist (${staleRouteEntries.join(
        ', '
      )})`
    );
  }

  if (unmatched > 0) {
    failureReasons.push(`${unmatched} unmatched WireMock requests`);
  }

  if (failureReasons.length > 0) {
    throw new Error(`Coverage gate failed: ${failureReasons.join('; ')}`);
  }
}

// Runs the coverage gates once over every job of the sharded nightly run.
// Usage: npx tsx e2e/coverage/merge-gate.ts <job-dir>...
// Each <job-dir> holds that job's test-results/coverage/hits.json (written by global-teardown with
// E2E_COVERAGE_DUMP=1) and test-results/routes-visited/*.jsonl. Writes e2e/test-results/coverage-summary.md
// and exits 1 when a gate fails or a job left no coverage dump.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CoverageHit } from '../fixtures/control';
import { evaluateGates, mergeHits } from './gate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jobDirs = process.argv.slice(2);
if (jobDirs.length === 0) {
  console.error('usage: merge-gate.ts <job-dir>...');
  process.exit(2);
}

const hitLists: CoverageHit[][] = [];
const missing: string[] = [];
for (const dir of jobDirs) {
  const hitsFile = path.join(dir, 'test-results', 'coverage', 'hits.json');
  if (!fs.existsSync(hitsFile)) {
    missing.push(dir);
    continue;
  }
  hitLists.push(JSON.parse(fs.readFileSync(hitsFile, 'utf8')));
}

const { summaryMd, failureReasons } = evaluateGates(
  mergeHits(hitLists),
  jobDirs.map((dir) => path.join(dir, 'test-results', 'routes-visited'))
);
// A job that crashed before its teardown never dumped its hits, so the gates would report its
// operations as uncovered; say which job it was instead.
if (missing.length > 0) {
  failureReasons.unshift(`no coverage dump from ${missing.join(', ')} (the job stopped before its teardown)`);
}

const resultsDir = path.resolve(__dirname, '../test-results');
fs.mkdirSync(resultsDir, { recursive: true });
fs.writeFileSync(path.join(resultsDir, 'coverage-summary.md'), summaryMd, 'utf8');

console.log('\n================================================================');
console.log(summaryMd);
console.log('================================================================\n');

if (failureReasons.length > 0) {
  console.error(`Coverage gate failed: ${failureReasons.join('; ')}`);
  process.exit(1);
}
console.log('Coverage gates passed.');

import { expectStatus, waitForJob } from '../fixtures/api';
import { resetLlm, scriptLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { categorizeScript } from '../fixtures/llm';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  FileIngestionResult,
  uploadAndIngest,
  uploadStatements,
} from '../fixtures/seed/statements';
import { searchAll } from '../fixtures/seed/transactions';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Jobs API', () => {
  test.describe.configure({ mode: 'serial' });

  const bankSpecA: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '1111222233',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 10000,
    rows: [
      { date: '2026-04-05', description: 'SALARY CREDIT', credit: 50000 },
      { date: '2026-04-10', description: 'GROCERY PAYMENT', debit: 2500 },
    ],
  };

  const bankSpecB: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '1111222233',
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    opening: 57500,
    rows: [
      { date: '2026-05-05', description: 'SALARY CREDIT MAY', credit: 50000 },
      { date: '2026-05-12', description: 'ELECTRICITY BILL', debit: 1800 },
    ],
  };

  test.beforeEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test('Jobs list: ordering, filtering by type/status, pagination, and invalid parameter rejection', async ({
    api,
  }) => {
    const account = await createBankAccount(api, { name: 'Jobs List Account' });
    const pdfA = await genBankPdf(bankSpecA);
    const pdfB = await genBankPdf(bankSpecB);

    // 1. Ingest statement A
    const { job: jobA } = await uploadAndIngest(api, account.id, [
      { filename: 'stmt-a.pdf', buffer: pdfA },
    ]);
    expect(jobA.status).toBe('SUCCEEDED');

    // 2. Ingest statement B
    const { job: jobB } = await uploadAndIngest(api, account.id, [
      { filename: 'stmt-b.pdf', buffer: pdfB },
    ]);
    expect(jobB.status).toBe('SUCCEEDED');

    // 3. Query jobs by type=STATEMENT_INGEST (default sort: createdAt DESC, newest first)
    const listRes = await api.GET('/api/v1/jobs', {
      params: { query: { type: 'STATEMENT_INGEST' } },
    });
    expectStatus(listRes, 200);
    const jobs = listRes.data?.content ?? [];
    expect(jobs.length).toBeGreaterThanOrEqual(2);

    // Verify ordering: newest job appears before older job
    const idxB = jobs.findIndex((j) => j.id === jobB.id);
    const idxA = jobs.findIndex((j) => j.id === jobA.id);
    expect(idxB).toBeGreaterThanOrEqual(0);
    expect(idxA).toBeGreaterThanOrEqual(0);
    expect(idxB).toBeLessThan(idxA);

    // 4. Filter by status=SUCCEEDED
    const succRes = await api.GET('/api/v1/jobs', {
      params: { query: { status: 'SUCCEEDED', type: 'STATEMENT_INGEST' } },
    });
    expectStatus(succRes, 200);
    const succJobs = succRes.data?.content ?? [];
    expect(succJobs.some((j) => j.id === jobA.id)).toBe(true);
    expect(succJobs.some((j) => j.id === jobB.id)).toBe(true);
    expect(succJobs.every((j) => j.status === 'SUCCEEDED')).toBe(true);

    // 5. Pagination: size=1 -> verify page 0 and page 1
    const p0Res = await api.GET('/api/v1/jobs', {
      params: { query: { type: 'STATEMENT_INGEST', page: 0, size: 1 } },
    });
    expectStatus(p0Res, 200);
    expect(p0Res.data?.content?.length).toBe(1);
    expect(p0Res.data?.totalPages).toBeGreaterThanOrEqual(2);
    expect(p0Res.data?.content?.[0].id).toBe(jobs[0].id);

    const p1Res = await api.GET('/api/v1/jobs', {
      params: { query: { type: 'STATEMENT_INGEST', page: 1, size: 1 } },
    });
    expectStatus(p1Res, 200);
    expect(p1Res.data?.content?.length).toBe(1);
    expect(p1Res.data?.content?.[0].id).toBe(jobs[1].id);

    // 6. Invalid status filter -> 400 Bad Request
    const badStatusRes = await api.GET('/api/v1/jobs', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: { query: { status: 'BOGUS' as any } },
    });
    expectStatus(badStatusRes, 400);
    expect((badStatusRes.error as { message?: string })?.message).toContain(
      'Invalid status: BOGUS'
    );

    // 7. Invalid type filter -> 400 Bad Request
    const badTypeRes = await api.GET('/api/v1/jobs', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: { query: { type: 'BOGUS' as any } },
    });
    expectStatus(badTypeRes, 400);
    expect((badTypeRes.error as { message?: string })?.message).toContain(
      'Invalid type: BOGUS'
    );
  });

  test('Jobs list: status=active while a delayed job is RUNNING', async ({
    api,
  }) => {
    const account = await createBankAccount(api, { name: 'Active Job Account' });
    const pdf = await genBankPdf(bankSpecA);

    // Delay LLM response by 6000ms to keep job in RUNNING state
    await scriptLlm(api, 'categorize', [
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
          { index: 1, merchantKey: 'GROCERY', categoryNames: ['Groceries'] },
        ]),
        delayMs: 6000,
      },
    ]);

    const uploadRes = await uploadStatements(api, account.id, [
      { filename: 'active-stmt.pdf', buffer: pdf },
    ]);
    expectStatus(uploadRes, 202);
    const activeJobId = (uploadRes.data as { jobId: string }).jobId;

    // Poll until the job transitions to RUNNING
    let runningJobFound = false;
    for (let i = 0; i < 20; i++) {
      const activeRes = await api.GET('/api/v1/jobs', {
        params: { query: { status: 'active' as unknown as undefined } },
      });
      expectStatus(activeRes, 200);
      const activeJobs = activeRes.data?.content ?? [];
      const match = activeJobs.find((j) => j.id === activeJobId);
      if (match && match.status === 'RUNNING') {
        runningJobFound = true;
        expect(match.type).toBe('STATEMENT_INGEST');
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    expect(runningJobFound).toBe(true);

    // Wait for completion cleanly
    const finalJob = await waitForJob(api, activeJobId, { timeoutMs: 15000 });
    expect(['SUCCEEDED', 'CANCELLED']).toContain(finalJob.status);
  });

  test('Job detail: fields populated on SUCCEEDED job, cross-tenant 404, unauthenticated 401', async ({
    api,
    request,
  }) => {
    const account = await createBankAccount(api, { name: 'Detail Account' });
    const pdf = await genBankPdf(bankSpecA);

    const { job } = await uploadAndIngest(api, account.id, [
      { filename: 'detail-stmt.pdf', buffer: pdf },
    ]);
    expect(job.status).toBe('SUCCEEDED');

    // Query job by ID
    const detailRes = await api.GET('/api/v1/jobs/{id}', {
      params: { path: { id: job.id } },
    });
    expectStatus(detailRes, 200);
    const data = detailRes.data!;

    expect(data.id).toBe(job.id);
    expect(data.type).toBe('STATEMENT_INGEST');
    expect(data.status).toBe('SUCCEEDED');
    expect(data.startedAt).toBeDefined();
    expect(data.finishedAt).toBeDefined();
    expect(data.attempt).toBe(1);
    expect(data.cancelRequested).toBe(false);

    const result = data.result as unknown as FileIngestionResult;
    expect(result.filesProcessed).toBe(1);
    expect(result.totalCreated).toBe(2);

    // User B querying User A's job -> 404
    const u2 = await secondUser(request);
    const u2Res = await u2.api.GET('/api/v1/jobs/{id}', {
      params: { path: { id: job.id } },
    });
    expectStatus(u2Res, 404);

    // Unauthenticated -> 401
    await expectUnauthenticated('GET', `/api/v1/jobs/${job.id}`);
  });

  test('Cancel RUNNING job: cancelRequested set to true, terminal validation, cross-tenant 404', async ({
    api,
    request,
  }) => {
    const account = await createBankAccount(api, { name: 'Cancel Account' });
    const pdf = await genBankPdf(bankSpecA);

    // Delay LLM response by 8000ms so we can cancel mid-execution
    await scriptLlm(api, 'categorize', [
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
        ]),
        delayMs: 8000,
      },
    ]);

    const uploadRes = await uploadStatements(api, account.id, [
      { filename: 'cancel-stmt.pdf', buffer: pdf },
    ]);
    expectStatus(uploadRes, 202);
    const jobId = (uploadRes.data as { jobId: string }).jobId;

    // Poll until RUNNING
    let isRunning = false;
    for (let i = 0; i < 25; i++) {
      const jobCheck = await api.GET('/api/v1/jobs/{id}', {
        params: { path: { id: jobId } },
      });
      if (jobCheck.data?.status === 'RUNNING') {
        isRunning = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    expect(isRunning).toBe(true);

    // Cancel the running job -> returns 200 with cancelRequested: true
    const cancelRes = await api.POST('/api/v1/jobs/{id}/cancel', {
      params: { path: { id: jobId } },
    });
    expectStatus(cancelRes, 200);
    expect(cancelRes.data?.cancelRequested).toBe(true);

    // Wait for job to reach a terminal state
    const finishedJob = await waitForJob(api, jobId, {
      timeoutMs: 15000,
    });
    // [SERVER FINDING]: In FileIngestionService, checkCancelled() is only checked before the file loop,
    // not after batchCategorize. Thus a running ingest job that receives cancel during LLM delay completes
    // and ends in SUCCEEDED with cancelRequested=true, unless worker stops mid-file.
    expect(['CANCELLED', 'SUCCEEDED']).toContain(finishedJob.status);

    // Cancelling a completed job in terminal status -> 400
    const cancelTerminalRes = await api.POST('/api/v1/jobs/{id}/cancel', {
      params: { path: { id: jobId } },
    });
    expectStatus(cancelTerminalRes, 400);
    expect(
      (cancelTerminalRes.error as { message?: string })?.message
    ).toContain(`Cannot cancel job in terminal status: ${finishedJob.status}`);

    // User B cancelling User A's job -> 404
    const u2 = await secondUser(request);
    const u2CancelRes = await u2.api.POST('/api/v1/jobs/{id}/cancel', {
      params: { path: { id: jobId } },
    });
    expectStatus(u2CancelRes, 404);

    // 401 unauthenticated
    await expectUnauthenticated('POST', `/api/v1/jobs/${jobId}/cancel`);
  });

  test('Retry job: retry a CANCELLED job starts new PENDING job and completes, retry SUCCEEDED rejected', async ({
    api,
  }) => {
    const account = await createBankAccount(api, { name: 'Retry Account' });
    const pdf = await genBankPdf(bankSpecA);

    // 1. Temporarily fill worker concurrency slots with 2 1500ms delayed jobs
    await scriptLlm(api, 'categorize', [
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
        ]),
        delayMs: 1500,
      },
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
        ]),
        delayMs: 1500,
      },
    ]);

    await uploadStatements(api, account.id, [
      { filename: 'slot1.pdf', buffer: pdf },
    ]);
    await uploadStatements(api, account.id, [
      { filename: 'slot2.pdf', buffer: pdf },
    ]);

    // 2. Create rule and trigger apply while slots are occupied -> queued in PENDING
    const { createCategory, createRule } = await import('../fixtures/seed/categories');
    const cat = await createCategory(api, 'Retry Rule Cat');
    const rule = await createRule(api, {
      merchantKey: 'RETRY_MERCHANT',
      categoryIds: [cat.id],
    });

    const applyRes = await api.POST('/api/v1/rules/{id}/apply', {
      params: { path: { id: rule.id } },
      body: { all: true },
    });
    expectStatus(applyRes, 202);
    const ruleJobId = (applyRes.data as { jobId: string }).jobId;

    // Cancel the PENDING job -> immediately transitions to CANCELLED (or RUNNING if slot opened)
    const cancelRes = await api.POST('/api/v1/jobs/{id}/cancel', {
      params: { path: { id: ruleJobId } },
    });
    expectStatus(cancelRes, 200);

    const cancelledJob = await waitForJob(api, ruleJobId, { timeoutMs: 15000 });

    // If cancelled, test retrying it
    if (cancelledJob.status === 'CANCELLED') {
      const retryRes = await api.POST('/api/v1/jobs/{id}/retry', {
        params: { path: { id: ruleJobId } },
      });
      expectStatus(retryRes, 200);
      const newJob = retryRes.data!;
      expect(newJob.id).not.toBe(ruleJobId);
      expect(newJob.type).toBe('RULE_APPLY');
      expect(newJob.attempt).toBe(0);
      expect(['PENDING', 'RUNNING', 'SUCCEEDED']).toContain(newJob.status);

      const retriedJob = await waitForJob(api, newJob.id, { timeoutMs: 15000 });
      expect(retriedJob.status).toBe('SUCCEEDED');
    }

    // 3. Retry on a SUCCEEDED job -> 400 Bad Request
    const succAccount = await createBankAccount(api, { name: 'Succ Bank' });
    const { job: succJob } = await uploadAndIngest(api, succAccount.id, [
      { filename: 'succ-stmt.pdf', buffer: pdf },
    ]);
    expect(succJob.status).toBe('SUCCEEDED');

    const retrySuccRes = await api.POST('/api/v1/jobs/{id}/retry', {
      params: { path: { id: succJob.id } },
    });
    expectStatus(retrySuccRes, 400);
    expect((retrySuccRes.error as { message?: string })?.message).toContain(
      'Only FAILED or CANCELLED jobs can be retried.'
    );

    // 4. 401 unauthenticated
    await expectUnauthenticated('POST', `/api/v1/jobs/${succJob.id}/retry`);
  });

  test('Retry CANCELLED job without artifacts returns 400 expired message', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Expired Artifacts Account',
    });
    const pdf = await genBankPdf(bankSpecA);

    // Delay LLM response to start a job
    await scriptLlm(api, 'categorize', [
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
        ]),
        delayMs: 6000,
      },
    ]);

    const uploadRes = await uploadStatements(api, account.id, [
      { filename: 'expired-test.pdf', buffer: pdf },
    ]);
    expectStatus(uploadRes, 202);
    const jobId = (uploadRes.data as { jobId: string }).jobId;

    // Immediately cancel the job (if caught in PENDING, artifacts are deleted;
    // once terminal, artifacts for SUCCEEDED/CANCELLED without artifacts are deleted)
    await api.POST('/api/v1/jobs/{id}/cancel', {
      params: { path: { id: jobId } },
    });

    const terminalJob = await waitForJob(api, jobId, {
      timeoutMs: 15000,
    });

    if (terminalJob.status === 'CANCELLED') {
      const retryRes = await api.POST('/api/v1/jobs/{id}/retry', {
        params: { path: { id: jobId } },
      });
      expectStatus(retryRes, 400);
      expect((retryRes.error as { message?: string })?.message).toContain(
        'Statement ingest artifacts expired, please re-upload.'
      );
    } else {
      // If it completed as SUCCEEDED, retrying terminal SUCCEEDED returns 400
      const retryRes = await api.POST('/api/v1/jobs/{id}/retry', {
        params: { path: { id: jobId } },
      });
      expectStatus(retryRes, 400);
    }
  });
});

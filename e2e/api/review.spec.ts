import { expectStatus } from '../fixtures/api';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { findById, searchAll } from '../fixtures/seed/transactions';
import { secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const UNKNOWN_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('Transaction Review & Ingested Review Reasons API', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  const reviewBankSpec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '9988776655',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 50000.0,
    rows: [
      // Duplicate pair 1 (also gets CATEGORY_UNVERIFIED via LLM categorization) -> TWO REASONS
      { date: '2026-04-05', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 650.0 },
      { date: '2026-04-05', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 650.0 },

      // Single row (gets CATEGORY_UNVERIFIED via LLM categorization) -> ONE REASON
      { date: '2026-04-12', description: 'UBER TRIP MUMBAI AIRPORT', debit: 1250.0 },

      // Duplicate pair 2 -> TWO REASONS
      { date: '2026-04-20', description: 'AMAZON PAY INDIA PURCHASE', debit: 3499.0 },
      { date: '2026-04-20', description: 'AMAZON PAY INDIA PURCHASE', debit: 3499.0 },
    ],
  };

  test('Ingest-produced review reasons: DUPLICATE_SUSPECT and CATEGORY_UNVERIFIED populated with reviewType=NEEDS_REVIEW', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Ingest Review Account',
    });
    const pdf = await genBankPdf(reviewBankSpec);

    const { job, result } = await uploadAndIngest(api, account.id, [
      { filename: 'review-stmt.pdf', buffer: pdf },
    ]);
    expect(job.status).toBe('SUCCEEDED');
    expect(result.filesProcessed).toBe(1);
    expect(result.totalCreated).toBe(5);
    expect(result.totalDuplicatesFound).toBe(4);

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);
    expect(txns.length).toBe(5);

    // All 5 rows should have reviewType = NEEDS_REVIEW
    for (const t of txns) {
      expect(t.reviewType).toBe('NEEDS_REVIEW');
      expect(t.reviewReasons?.length).toBeGreaterThanOrEqual(1);
    }

    // Duplicate rows carry DUPLICATE_SUSPECT
    const blueTokaiRows = txns.filter((t) =>
      (t.sourcedDescription || t.description || '').includes('BLUE TOKAI')
    );
    expect(blueTokaiRows.length).toBe(2);
    for (const s of blueTokaiRows) {
      expect(s.reviewReasons).toContain('DUPLICATE_SUSPECT');
      expect(s.reviewReasons).toContain('CATEGORY_UNVERIFIED');
    }

    // Single row carries CATEGORY_UNVERIFIED but not DUPLICATE_SUSPECT
    const uberRow = txns.find((t) =>
      (t.sourcedDescription || t.description || '').includes('UBER')
    );
    expect(uberRow).toBeDefined();
    expect(uberRow?.reviewReasons).toContain('CATEGORY_UNVERIFIED');
    expect(uberRow?.reviewReasons).not.toContain('DUPLICATE_SUSPECT');
  });

  test('Batch review reason-scoped partial resolution: reason matching, skips, two-reason state transition', async ({
    api,
    request,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Batch Review Account',
    });
    const pdf = await genBankPdf(reviewBankSpec);

    await uploadAndIngest(api, account.id, [
      { filename: 'batch-review-stmt.pdf', buffer: pdf },
    ]);

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);

    const blueTokaiRows = txns.filter((t) =>
      (t.sourcedDescription || t.description || '').includes('BLUE TOKAI')
    );
    const uberRow = txns.find((t) =>
      (t.sourcedDescription || t.description || '').includes('UBER')
    )!;

    const u2 = await secondUser(request);
    const u2Account = await createBankAccount(u2.api, {
      name: 'Foreign Account',
    });
    const foreignPdf = await genBankPdf(reviewBankSpec);
    await uploadAndIngest(u2.api, u2Account.id, [
      { filename: 'foreign-stmt.pdf', buffer: foreignPdf },
    ]);
    const foreignTxns = await searchAll(u2.api, [
      { field: 'accountId', operator: 'is', value: u2Account.id },
    ]);
    const foreignTxnId = foreignTxns[0].id;

    // 1. Batch review DUPLICATE_SUSPECT on a mixed set:
    // - blueTokaiRows[0] has DUPLICATE_SUSPECT -> should succeed
    // - uberRow does NOT have DUPLICATE_SUSPECT -> should be skipped
    // - foreignTxnId is not owned -> should fail
    // - UNKNOWN_UUID is not found -> should fail
    const batch1Res = await api.POST('/api/v1/transactions/batch-review', {
      body: {
        transactionIds: [
          blueTokaiRows[0].id,
          uberRow.id,
          foreignTxnId,
          UNKNOWN_UUID,
        ],
        reviewType: 'MANUALLY_REVIEWED',
        reviewReasons: ['DUPLICATE_SUSPECT'],
      },
    });
    expectStatus(batch1Res, 200);
    const res1 = batch1Res.data!;

    expect(res1.succeededIds).toContain(blueTokaiRows[0].id);
    expect(res1.skippedIds).toContain(uberRow.id);
    expect(
      res1.failures.some((f: { id: string }) => f.id === foreignTxnId)
    ).toBe(true);
    expect(res1.failures.some((f: { id: string }) => f.id === UNKNOWN_UUID)).toBe(
      true
    );

    // 2. Verify blueTokaiRows[0] remains NEEDS_REVIEW with CATEGORY_UNVERIFIED (since only DUPLICATE_SUSPECT was cleared)
    const after1 = await findById(api, blueTokaiRows[0].id);
    expect(after1?.reviewType).toBe('NEEDS_REVIEW');
    expect(after1?.reviewReasons).not.toContain('DUPLICATE_SUSPECT');
    expect(after1?.reviewReasons).toContain('CATEGORY_UNVERIFIED');

    // 3. Clear remaining reason CATEGORY_UNVERIFIED on blueTokaiRows[0]
    const batch2Res = await api.POST('/api/v1/transactions/batch-review', {
      body: {
        transactionIds: [blueTokaiRows[0].id],
        reviewType: 'MANUALLY_REVIEWED',
        reviewReasons: ['CATEGORY_UNVERIFIED'],
      },
    });
    expectStatus(batch2Res, 200);
    expect(batch2Res.data?.succeededIds).toContain(blueTokaiRows[0].id);

    // 4. Verify blueTokaiRows[0] is now MANUALLY_REVIEWED with reviewedAt populated and empty reviewReasons
    const after2 = await findById(api, blueTokaiRows[0].id);
    expect(after2?.reviewType).toBe('MANUALLY_REVIEWED');
    expect(after2?.reviewReasons?.length ?? 0).toBe(0);
    expect(after2?.reviewedAt).toBeDefined();
  });

  test('Transactions search: filter by reviewType and reviewReason, verify rows drop out after review', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Search Filter Account',
    });
    const pdf = await genBankPdf(reviewBankSpec);

    await uploadAndIngest(api, account.id, [
      { filename: 'search-stmt.pdf', buffer: pdf },
    ]);

    // 1. Search with reviewType = NEEDS_REVIEW -> all 5 rows returned
    const needsReviewRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
    ]);
    expect(needsReviewRows.length).toBe(5);

    // 2. Search with reviewReason = DUPLICATE_SUSPECT -> exactly the 4 duplicate rows returned
    const dupRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewReason', operator: 'is', value: 'DUPLICATE_SUSPECT' },
    ]);
    expect(dupRows.length).toBe(4);

    // 3. Search with reviewReason = CATEGORY_UNVERIFIED -> all 5 rows returned
    const unverifiedRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewReason', operator: 'is', value: 'CATEGORY_UNVERIFIED' },
    ]);
    expect(unverifiedRows.length).toBe(5);

    // 4. Review all duplicate rows for DUPLICATE_SUSPECT and CATEGORY_UNVERIFIED
    const allIds = needsReviewRows.map((r) => r.id);
    await api.POST('/api/v1/transactions/batch-review', {
      body: {
        transactionIds: allIds,
        reviewType: 'MANUALLY_REVIEWED',
        reviewReasons: ['DUPLICATE_SUSPECT', 'CATEGORY_UNVERIFIED'],
      },
    });

    // 5. Search with reviewType = NEEDS_REVIEW -> now 0 rows returned
    const remainingNeedsReview = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
    ]);
    expect(remainingNeedsReview.length).toBe(0);

    // 6. Search with reviewType = MANUALLY_REVIEWED -> all 5 rows returned
    const manualRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewType', operator: 'is', value: 'MANUALLY_REVIEWED' },
    ]);
    expect(manualRows.length).toBe(5);
  });

  test('Merge duplicate pair: kept row clears DUPLICATE_SUSPECT and delete row is removed', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Merge Review Account',
    });
    const pdf = await genBankPdf(reviewBankSpec);

    await uploadAndIngest(api, account.id, [
      { filename: 'merge-stmt.pdf', buffer: pdf },
    ]);

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);

    const amazonRows = txns.filter((t) =>
      (t.sourcedDescription || t.description || '').includes('AMAZON')
    );
    expect(amazonRows.length).toBe(2);
    const [keepTxn, deleteTxn] = amazonRows;

    // Execute merge
    const mergeRes = await api.POST('/api/v1/transactions/merge', {
      body: {
        keepId: keepTxn.id,
        deleteId: deleteTxn.id,
      },
    });
    expectStatus(mergeRes, 200);
    expect(mergeRes.data?.keptId).toBe(keepTxn.id);

    // Deleted transaction must be completely removed
    const allAfter = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);
    expect(allAfter.some((t) => t.id === deleteTxn.id)).toBe(false);

    // Kept transaction's review reasons no longer include DUPLICATE_SUSPECT
    const keptAfter = allAfter.find((t) => t.id === keepTxn.id);
    expect(keptAfter).toBeDefined();
    expect(keptAfter?.reviewReasons).not.toContain('DUPLICATE_SUSPECT');
  });
});

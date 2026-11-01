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

  // Rows of one statement are never compared with each other, so the duplicates come from an
  // overlapping statement that repeats the Blue Tokai and Amazon rows (same date, same narration).
  const reviewBankSpec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '9988776655',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 50000.0,
    rows: [
      // Repeated in the overlapping statement -> ONE REASON
      { date: '2026-04-05', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 650.0 },

      // Single row -> NO REASON, auto-reviewed
      { date: '2026-04-12', description: 'UBER TRIP MUMBAI AIRPORT', debit: 1250.0 },

      // Repeated in the overlapping statement -> ONE REASON
      { date: '2026-04-20', description: 'AMAZON PAY INDIA PURCHASE', debit: 3499.0 },
    ],
  };

  const overlapBankSpec: BankSpec = {
    ...reviewBankSpec,
    periodStart: '2026-04-05',
    periodEnd: '2026-05-04',
    rows: [
      { date: '2026-04-05', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 650.0 },
      { date: '2026-04-20', description: 'AMAZON PAY INDIA PURCHASE', debit: 3499.0 },
    ],
  };

  const reviewFiles = async (name: string) => [
    { filename: `${name}.pdf`, buffer: await genBankPdf(reviewBankSpec) },
    { filename: `${name}-overlap.pdf`, buffer: await genBankPdf(overlapBankSpec) },
  ];

  test('Ingest-produced review reasons: DUPLICATE_SUSPECT populated with reviewType=NEEDS_REVIEW, clean rows auto-reviewed', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Ingest Review Account',
    });
    const { job, result } = await uploadAndIngest(api, account.id, await reviewFiles('review-stmt'));
    expect(job.status).toBe('SUCCEEDED');
    expect(result.filesProcessed).toBe(2);
    expect(result.totalCreated).toBe(5);
    expect(result.totalDuplicatesFound).toBe(4);

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);
    expect(txns.length).toBe(5);

    // The 4 duplicate rows need review; the single Uber row has no reason and is auto-reviewed
    const flagged = txns.filter((t) => t.reviewType === 'NEEDS_REVIEW');
    expect(flagged.length).toBe(4);
    for (const t of flagged) {
      expect(t.reviewReasons).toEqual(['DUPLICATE_SUSPECT']);
    }

    // Duplicate rows carry DUPLICATE_SUSPECT
    const blueTokaiRows = txns.filter((t) =>
      (t.sourcedDescription || t.description || '').includes('BLUE TOKAI')
    );
    expect(blueTokaiRows.length).toBe(2);
    for (const s of blueTokaiRows) {
      expect(s.reviewReasons).toContain('DUPLICATE_SUSPECT');
    }

    // Single row carries no review reason and is auto-reviewed
    const uberRow = txns.find((t) =>
      (t.sourcedDescription || t.description || '').includes('UBER')
    );
    expect(uberRow).toBeDefined();
    expect(uberRow?.reviewReasons ?? []).toEqual([]);
    expect(uberRow?.reviewType).toBe('AUTO_REVIEWED');
  });

  test('Batch review reason-scoped partial resolution: reason matching, skips, two-reason state transition', async ({
    api,
    request,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Batch Review Account',
    });
    await uploadAndIngest(api, account.id, await reviewFiles('batch-review-stmt'));

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

    // 2. blueTokaiRows[0] had only DUPLICATE_SUSPECT, so clearing it makes the row MANUALLY_REVIEWED
    // with reviewedAt populated and no reasons left
    const after1 = await findById(api, blueTokaiRows[0].id);
    expect(after1?.reviewType).toBe('MANUALLY_REVIEWED');
    expect(after1?.reviewReasons?.length ?? 0).toBe(0);
    expect(after1?.reviewedAt).toBeDefined();
  });

  test('Transactions search: filter by reviewType and reviewReason, verify rows drop out after review', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Search Filter Account',
    });
    await uploadAndIngest(api, account.id, await reviewFiles('search-stmt'));

    // 1. Search with reviewType = NEEDS_REVIEW -> the 4 duplicate rows (the Uber row is auto-reviewed)
    const needsReviewRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
    ]);
    expect(needsReviewRows.length).toBe(4);

    // 2. Search with reviewReason = DUPLICATE_SUSPECT -> exactly the 4 duplicate rows returned
    const dupRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewReason', operator: 'is', value: 'DUPLICATE_SUSPECT' },
    ]);
    expect(dupRows.length).toBe(4);

    // 3. Review all flagged rows for DUPLICATE_SUSPECT
    const allIds = needsReviewRows.map((r) => r.id);
    await api.POST('/api/v1/transactions/batch-review', {
      body: {
        transactionIds: allIds,
        reviewType: 'MANUALLY_REVIEWED',
        reviewReasons: ['DUPLICATE_SUSPECT'],
      },
    });

    // 4. Search with reviewType = NEEDS_REVIEW -> now 0 rows returned
    const remainingNeedsReview = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
    ]);
    expect(remainingNeedsReview.length).toBe(0);

    // 5. Search with reviewType = MANUALLY_REVIEWED -> the 4 reviewed rows returned
    const manualRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewType', operator: 'is', value: 'MANUALLY_REVIEWED' },
    ]);
    expect(manualRows.length).toBe(4);
  });

  test('Merge duplicate pair: kept row clears DUPLICATE_SUSPECT and delete row is removed', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Merge Review Account',
    });
    await uploadAndIngest(api, account.id, await reviewFiles('merge-stmt'));

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

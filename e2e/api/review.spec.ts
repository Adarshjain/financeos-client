import { expectStatus } from '../fixtures/api';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { uploadAndIngest } from '../fixtures/seed/statements';
import type { TransactionResponse } from '../fixtures/seed/transactions';
import { createTransaction, findById, searchAll } from '../fixtures/seed/transactions';
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

  // An overlapping statement that repeats the Blue Tokai and Amazon rows ATTACHES to the existing rows
  // (nothing new is created, nothing is flagged). Rows that need review are put there with a PUT.
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

  type Api = Parameters<typeof searchAll>[0];
  const putReason = async (api: Api, t: TransactionResponse, reviewReasons: ('DUPLICATE_SUSPECT')[]) =>
    expectStatus(
      await api.PUT('/api/v1/transactions/{id}', {
        params: { path: { id: t.id } },
        body: { date: t.date, amount: t.amount!, description: t.description ?? 'ROW', reviewType: 'NEEDS_REVIEW', reviewReasons },
      }),
      200,
    );
  // Ingests both files (3 rows) and flags the Blue Tokai and Amazon rows plus a manual Amazon twin.
  const seedFlagged = async (api: Api, accountId: string, name: string) => {
    await uploadAndIngest(api, accountId, await reviewFiles(name));
    const rows = await searchAll(api, [{ field: 'accountId', operator: 'is', value: accountId }]);
    const twin = await createTransaction(api, accountId, { date: '2026-04-21', amount: -3499, description: 'AMAZON PAY INDIA TWIN' });
    const flagged = [...rows.filter((t) => !(t.sourcedDescription ?? '').includes('UBER')), twin];
    for (const t of flagged) await putReason(api, t, ['DUPLICATE_SUSPECT']);
    return flagged;
  };

  test('Overlapping statement attaches (no flags); a row put in review carries its reason, clean rows stay auto-reviewed', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Ingest Review Account',
    });
    const { job, result } = await uploadAndIngest(api, account.id, await reviewFiles('review-stmt'));
    expect(job.status).toBe('SUCCEEDED');
    expect(result.filesProcessed).toBe(2);
    // The overlap file's two rows attach to the first file's rows.
    expect(result.totalCreated).toBe(3);

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);
    expect(txns.length).toBe(3);
    for (const t of txns) {
      expect(t.reviewType).toBe('AUTO_REVIEWED');
      expect(t.reviewReasons ?? []).toEqual([]);
    }

    const blueTokai = txns.find((t) => (t.sourcedDescription || t.description || '').includes('BLUE TOKAI'))!;
    await putReason(api, blueTokai, ['DUPLICATE_SUSPECT']);
    const flagged = await findById(api, blueTokai.id);
    expect(flagged?.reviewType).toBe('NEEDS_REVIEW');
    expect(flagged?.reviewReasons).toEqual(['DUPLICATE_SUSPECT']);

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
    const flagged = await seedFlagged(api, account.id, 'batch-review-stmt');

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);

    const blueTokaiRows = flagged.filter((t) =>
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
    await seedFlagged(api, account.id, 'search-stmt');

    // 1. Search with reviewType = NEEDS_REVIEW -> the 3 flagged rows (the Uber row is auto-reviewed)
    const needsReviewRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
    ]);
    expect(needsReviewRows.length).toBe(3);

    // 2. Search with reviewReason = DUPLICATE_SUSPECT -> exactly the 3 flagged rows returned
    const dupRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewReason', operator: 'is', value: 'DUPLICATE_SUSPECT' },
    ]);
    expect(dupRows.length).toBe(3);

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

    // 5. Search with reviewType = MANUALLY_REVIEWED -> the 3 reviewed rows returned
    const manualRows = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
      { field: 'reviewType', operator: 'is', value: 'MANUALLY_REVIEWED' },
    ]);
    expect(manualRows.length).toBe(3);
  });

  test('Merge duplicate pair: kept row clears DUPLICATE_SUSPECT and delete row is removed', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Merge Review Account',
    });
    const flagged = await seedFlagged(api, account.id, 'merge-stmt');

    const amazonRows = flagged.filter((t) =>
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

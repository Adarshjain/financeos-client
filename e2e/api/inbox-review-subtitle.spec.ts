import { expectStatus } from '../fixtures/api';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { getInbox, inboxRow } from '../fixtures/seed/nav';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { findById, searchAll } from '../fixtures/seed/transactions';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

// ReviewInboxCollector subtitle: "<n> waiting for review" (the category-flagged split went with CATEGORY_UNVERIFIED).
test.describe('Inbox API: review summary subtitle (@api)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  const spec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '9988776622',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 50000.0,
    rows: [
      { date: '2026-04-05', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 650.0 },
      { date: '2026-04-12', description: 'UBER TRIP MUMBAI AIRPORT', debit: 1250.0 },
    ],
  };

  // Rows of one statement are never compared, so an overlapping statement repeats the Blue Tokai row
  // to make both copies DUPLICATE_SUSPECT. The parser needs two rows to place the amount column, so
  // it also carries a Netflix row, reviewed away first below.
  const overlap: BankSpec = {
    ...spec,
    periodStart: '2026-04-05',
    periodEnd: '2026-05-04',
    rows: [
      { date: '2026-04-05', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 650.0 },
      { date: '2026-04-25', description: 'NETFLIX SUBSCRIPTION', debit: 649.0 },
    ],
  };

  test('the subtitle counts the rows waiting for review and follows the queue as it drains', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-review-subtitle');
    const account = await createBankAccount(api, { name: 'Subtitle Account' });
    await uploadAndIngest(api, account.id, [
      { filename: 'subtitle.pdf', buffer: await genBankPdf(spec) },
      { filename: 'subtitle-overlap.pdf', buffer: await genBankPdf(overlap) },
    ]);

    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: account.id }]);
    const tokai = txns.filter((t) => (t.sourcedDescription || t.description || '').includes('BLUE TOKAI'));
    const uber = txns.find((t) => (t.sourcedDescription || t.description || '').includes('UBER'))!;
    expect(tokai).toHaveLength(2);
    expect(tokai[0].reviewReasons).toEqual(['DUPLICATE_SUSPECT']);
    // Rows with no reason (here Uber) are auto-reviewed and never wait.
    expect(uber.reviewReasons ?? []).toEqual([]);
    expect(uber.reviewType).toBe('AUTO_REVIEWED');

    // Only the two duplicate copies wait.
    const full = inboxRow(await getInbox(api), 'review')!;
    expect(full.count).toBe(2);
    expect(full.subtitle).toBe('2 waiting for review');

    const review = async (ids: string[], reason: string) => {
      const res = await api.POST('/api/v1/transactions/batch-review', {
        body: { transactionIds: ids, reviewType: 'MANUALLY_REVIEWED', reviewReasons: [reason as 'DUPLICATE_SUSPECT'] },
      });
      expectStatus(res, 200);
      expect(res.data!.succeededIds).toEqual(ids);
    };

    // tokai[0] fully reviewed (leaves the queue); tokai[1] still waits.
    await review([tokai[0].id], 'DUPLICATE_SUSPECT');
    expect((await findById(api, tokai[0].id))?.reviewType).toBe('MANUALLY_REVIEWED');
    const dupOnly = await findById(api, tokai[1].id);
    expect(dupOnly?.reviewType).toBe('NEEDS_REVIEW');
    expect(dupOnly?.reviewReasons).toEqual(['DUPLICATE_SUSPECT']);
    const one = inboxRow(await getInbox(api), 'review')!;
    expect(one.count).toBe(1);
    expect(one.subtitle).toBe('1 waiting for review');

    // Clearing the last reason empties the queue and removes the row.
    await review([tokai[1].id], 'DUPLICATE_SUSPECT');
    expect(inboxRow(await getInbox(api), 'review')).toBeUndefined();
  });
});

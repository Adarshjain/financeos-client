import { expectStatus } from '../fixtures/api';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { getInbox, inboxRow } from '../fixtures/seed/nav';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { findById, searchAll } from '../fixtures/seed/transactions';
import { newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

// ReviewInboxCollector subtitle: "<c> flagged for category[ · <t-c> other]" when any waiting row carries
// CATEGORY_UNVERIFIED, otherwise "<n> waiting for review".
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
      { date: '2026-04-05', description: 'BLUE TOKAI COFFEE ROASTERS', debit: 650.0 },
      { date: '2026-04-12', description: 'UBER TRIP MUMBAI AIRPORT', debit: 1250.0 },
    ],
  };

  test('the subtitle splits category-flagged rows from other review reasons and follows the queue as it drains', async ({ request }) => {
    const { api } = await newUser(request, 'inbox-review-subtitle');
    const account = await createBankAccount(api, { name: 'Subtitle Account' });
    await uploadAndIngest(api, account.id, [{ filename: 'subtitle.pdf', buffer: await genBankPdf(spec) }]);

    const txns = await searchAll(api, [{ field: 'accountId', operator: 'is', value: account.id }]);
    const tokai = txns.filter((t) => (t.sourcedDescription || t.description || '').includes('BLUE TOKAI'));
    const uber = txns.find((t) => (t.sourcedDescription || t.description || '').includes('UBER'))!;
    expect(tokai).toHaveLength(2);
    expect(tokai[0].reviewReasons).toEqual(expect.arrayContaining(['DUPLICATE_SUSPECT', 'CATEGORY_UNVERIFIED']));
    expect(uber.reviewReasons).toContain('CATEGORY_UNVERIFIED');

    // Every waiting row is category-flagged: no "other" tail.
    const full = inboxRow(await getInbox(api), 'review')!;
    expect(full.count).toBe(3);
    expect(full.subtitle).toBe('3 flagged for category');

    const review = async (ids: string[], reason: string) => {
      const res = await api.POST('/api/v1/transactions/batch-review', {
        body: { transactionIds: ids, reviewType: 'MANUALLY_REVIEWED', reviewReasons: [reason as 'CATEGORY_UNVERIFIED'] },
      });
      expectStatus(res, 200);
      expect(res.data!.succeededIds).toEqual(ids);
    };

    // tokai[0] fully reviewed (leaves the queue); tokai[1] keeps only DUPLICATE_SUSPECT; uber keeps CATEGORY_UNVERIFIED.
    await review([tokai[0].id], 'DUPLICATE_SUSPECT');
    await review([tokai[0].id, tokai[1].id], 'CATEGORY_UNVERIFIED');
    expect((await findById(api, tokai[0].id))?.reviewType).toBe('MANUALLY_REVIEWED');
    const dupOnly = await findById(api, tokai[1].id);
    expect(dupOnly?.reviewType).toBe('NEEDS_REVIEW');
    expect(dupOnly?.reviewReasons).toEqual(['DUPLICATE_SUSPECT']);

    const mixed = inboxRow(await getInbox(api), 'review')!;
    expect(mixed.count).toBe(2);
    expect(mixed.subtitle).toBe('1 flagged for category · 1 other');

    // Once the category-flagged row is cleared, only the duplicate-suspect row waits: plain wording.
    await review([uber.id], 'CATEGORY_UNVERIFIED');
    const plain = inboxRow(await getInbox(api), 'review')!;
    expect(plain.count).toBe(1);
    expect(plain.subtitle).toBe('1 waiting for review');

    // Clearing the last reason empties the queue and removes the row.
    await review([tokai[1].id], 'DUPLICATE_SUSPECT');
    expect(inboxRow(await getInbox(api), 'review')).toBeUndefined();
  });
});

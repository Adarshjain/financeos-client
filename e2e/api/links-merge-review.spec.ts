import { expectStatus } from '../fixtures/api';
import {
  createBankAccount,
  createCreditCard,
} from '../fixtures/seed/accounts';
import { createCategory } from '../fixtures/seed/categories';
import {
  createTransaction,
  findById,
  searchAll,
} from '../fixtures/seed/transactions';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const UNKNOWN_UUID = '00000000-0000-0000-0000-000000000000';

test.describe('Transaction Links, Merge & Review API', () => {
  test.describe('Transaction Links', () => {
    test('create TRANSFER link, verify roleLabels, query links, and delete link', async ({
      api,
    }) => {
      const bankA = await createBankAccount(api, { name: 'Transfer Bank A' });
      const bankB = await createBankAccount(api, { name: 'Transfer Bank B' });

      // TRANSFER requires: exactly 2 members, anchor DEBIT, counterpart CREDIT, different accounts
      const debitTxn = await createTransaction(api, bankA.id, {
        amount: -5000,
        description: 'Transfer Out to Bank B',
      });
      const creditTxn = await createTransaction(api, bankB.id, {
        amount: 5000,
        description: 'Transfer In from Bank A',
      });

      // 1. Create TRANSFER link
      const linkRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'TRANSFER',
          note: 'Inter-account transfer',
          members: [
            { transactionId: debitTxn.id, isAnchor: true },
            { transactionId: creditTxn.id, isAnchor: false },
          ],
        },
      });
      expectStatus(linkRes, 201);
      const link = linkRes.data!;
      expect(link.id).toBeDefined();
      expect(link.type).toBe('TRANSFER');
      expect(link.note).toBe('Inter-account transfer');
      expect(link.members.length).toBe(2);

      // Verify role labels: anchor is "Transfer out", counterpart is "Transfer in"
      const anchorMember = link.members.find((m) => m.isAnchor);
      const counterpartMember = link.members.find((m) => !m.isAnchor);
      expect(anchorMember?.roleLabel).toBe('Transfer out');
      expect(counterpartMember?.roleLabel).toBe('Transfer in');

      // 2. Query link by transaction ID
      const queryRes = await api.GET('/api/v1/transaction-links', {
        params: { query: { transactionId: debitTxn.id } },
      });
      expectStatus(queryRes, 200);
      expect(queryRes.data?.length).toBe(1);
      expect(queryRes.data?.[0].id).toBe(link.id);

      // 3. GET link by ID
      const getLinkRes = await api.GET('/api/v1/transaction-links/{id}', {
        params: { path: { id: link.id } },
      });
      expectStatus(getLinkRes, 200);
      expect(getLinkRes.data?.id).toBe(link.id);

      // 4. Verify transactions carry link summaries in search
      const debitCheck = await findById(api, debitTxn.id);
      expect(debitCheck?.links.length).toBe(1);
      expect(debitCheck?.links[0].linkId).toBe(link.id);
      expect(debitCheck?.links[0].type).toBe('TRANSFER');
      expect(debitCheck?.links[0].roleLabel).toBe('Transfer out');

      // 5. Invariant: reject second link on an already-linked transaction
      const secondLinkRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'TRANSFER',
          members: [
            { transactionId: debitTxn.id, isAnchor: true },
            { transactionId: creditTxn.id, isAnchor: false },
          ],
        },
      });
      expectStatus(secondLinkRes, 400);

      // 6. Delete link
      const delLinkRes = await api.DELETE('/api/v1/transaction-links/{id}', {
        params: { path: { id: link.id } },
      });
      expectStatus(delLinkRes, 204);

      // Verify link is removed
      const postDelRes = await api.GET('/api/v1/transaction-links/{id}', {
        params: { path: { id: link.id } },
      });
      expectStatus(postDelRes, 404);

      // Verify transactions no longer show the link summary
      const debitAfter = await findById(api, debitTxn.id);
      expect(debitAfter?.links.length).toBe(0);
    });

    test('create links for CC_PAYMENT, REFUND (alignRefundCategories), REVERSAL, FEE, and EMI', async ({
      api,
    }) => {
      const bank = await createBankAccount(api, { name: 'Multi Link Bank' });
      const cc = await createCreditCard(api, { name: 'Multi Link Card' });
      const cat = await createCategory(api, 'Electronics Purchase');

      // 1. CC_PAYMENT: bank DEBIT (anchor) -> credit_card CREDIT
      const ccPayDebit = await createTransaction(api, bank.id, {
        amount: -12000,
        description: 'HDFC CC Bill Pay',
      });
      const ccPayCredit = await createTransaction(api, cc.id, {
        amount: 12000,
        description: 'Payment Received',
      });
      const ccLinkRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'CC_PAYMENT',
          members: [
            { transactionId: ccPayDebit.id, isAnchor: true },
            { transactionId: ccPayCredit.id, isAnchor: false },
          ],
        },
      });
      expectStatus(ccLinkRes, 201);
      expect(ccLinkRes.data?.type).toBe('CC_PAYMENT');

      // 2. REFUND with alignRefundCategories: DEBIT anchor with category, CREDIT counterpart
      const purchaseTxn = await createTransaction(api, cc.id, {
        amount: -2500,
        description: 'Online Store Purchase',
        categoryIds: [cat.id],
      });
      const refundTxn = await createTransaction(api, cc.id, {
        amount: 2500,
        description: 'Online Store Refund',
      });
      const refundLinkRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'REFUND',
          alignRefundCategories: true,
          members: [
            { transactionId: purchaseTxn.id, isAnchor: true },
            { transactionId: refundTxn.id, isAnchor: false },
          ],
        },
      });
      expectStatus(refundLinkRes, 201);
      expect(refundLinkRes.data?.type).toBe('REFUND');

      // Verify alignRefundCategories copied categories from anchor to counterpart
      const refundAfter = await findById(api, refundTxn.id);
      expect(refundAfter?.categories.map((c) => c.id)).toContain(cat.id);

      // 3. REVERSAL: DEBIT and CREDIT on same account
      const revDebit = await createTransaction(api, bank.id, {
        amount: -150,
        description: 'ATM Declined Fee',
      });
      const revCredit = await createTransaction(api, bank.id, {
        amount: 150,
        description: 'ATM Fee Reversal',
      });
      const revLinkRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'REVERSAL',
          members: [
            { transactionId: revDebit.id, isAnchor: true },
            { transactionId: revCredit.id, isAnchor: false },
          ],
        },
      });
      expectStatus(revLinkRes, 201);
      expect(revLinkRes.data?.type).toBe('REVERSAL');

      // 4. FEE: DEBIT anchor, DEBIT counterpart
      const parentCharge = await createTransaction(api, cc.id, {
        amount: -8000,
        description: 'Forex Transaction',
      });
      const feeTxn = await createTransaction(api, cc.id, {
        amount: -280,
        description: 'Forex Markup Fee',
      });
      const feeLinkRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'FEE',
          members: [
            { transactionId: parentCharge.id, isAnchor: true },
            { transactionId: feeTxn.id, isAnchor: false },
          ],
        },
      });
      expectStatus(feeLinkRes, 201);
      expect(feeLinkRes.data?.type).toBe('FEE');

      // 5. EMI: DEBIT anchor, DEBIT counterpart
      const emiParent = await createTransaction(api, cc.id, {
        amount: -60000,
        description: 'Laptop Purchase',
      });
      const emiInstallment = await createTransaction(api, cc.id, {
        amount: -10000,
        description: 'EMI 1 of 6',
      });
      const emiLinkRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'EMI',
          members: [
            { transactionId: emiParent.id, isAnchor: true },
            { transactionId: emiInstallment.id, isAnchor: false },
          ],
        },
      });
      expectStatus(emiLinkRes, 201);
      expect(emiLinkRes.data?.type).toBe('EMI');
    });

    test('link validation errors and tenancy', async ({
      api,
      request,
    }) => {
      const bankA = await createBankAccount(api, { name: 'Tenant A Bank' });
      const u2 = await secondUser(request);
      const bankB = await createBankAccount(u2.api, { name: 'Tenant B Bank' });

      const txA = await createTransaction(api, bankA.id, { amount: -100 });
      const txB = await createTransaction(u2.api, bankB.id, {
        amount: 100,
      });

      // 1. Link with only 1 member -> 400
      const oneMemberRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'TRANSFER',
          members: [{ transactionId: txA.id, isAnchor: true }],
        },
      });
      expectStatus(oneMemberRes, 400);

      // 2. Link with unknown transaction ID -> 404
      const unknownTxRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'TRANSFER',
          members: [
            { transactionId: txA.id, isAnchor: true },
            { transactionId: UNKNOWN_UUID, isAnchor: false },
          ],
        },
      });
      expectStatus(unknownTxRes, 404);

      // 3. Link containing User B's transaction -> 404 (due to tenant filtering, foreign txns are invisible)
      const crossTenantLinkRes = await api.POST('/api/v1/transaction-links', {
        body: {
          type: 'TRANSFER',
          members: [
            { transactionId: txA.id, isAnchor: true },
            { transactionId: txB.id, isAnchor: false },
          ],
        },
      });
      expect([400, 404]).toContain(crossTenantLinkRes.response.status);
    });

    test('401 unauthorized on link endpoints without session', async () => {
      await expectUnauthenticated('GET', `/api/v1/transaction-links?transactionId=${UNKNOWN_UUID}`);
      await expectUnauthenticated('GET', `/api/v1/transaction-links/${UNKNOWN_UUID}`);
      await expectUnauthenticated('POST', '/api/v1/transaction-links', {
        type: 'TRANSFER',
        members: [],
      });
      await expectUnauthenticated('DELETE', `/api/v1/transaction-links/${UNKNOWN_UUID}`);
    });
  });

  test.describe('Transaction Merge', () => {
    test('merge two transactions: kept row carries over fields and deleted row is removed', async ({
      api,
    }) => {
      const account = await createBankAccount(api, { name: 'Merge Account' });
      const cat = await createCategory(api, 'Merge Category');

      // Transaction to keep (missing categories and mcc)
      const keptTxn = await createTransaction(api, account.id, {
        amount: -1500,
        description: 'Kept Transaction Description',
      });

      // Transaction to delete (has categories and mcc)
      const deletedTxn = await createTransaction(api, account.id, {
        amount: -1500,
        categoryIds: [cat.id],
        mcc: '5411',
      });

      // Execute merge
      const mergeRes = await api.POST('/api/v1/transactions/merge', {
        body: {
          keepId: keptTxn.id,
          deleteId: deletedTxn.id,
        },
      });
      expectStatus(mergeRes, 200);
      expect(mergeRes.data?.keptId).toBe(keptTxn.id);

      // Verify deleted transaction is completely gone
      const allTxns = await searchAll(api);
      expect(allTxns.some((t) => t.id === deletedTxn.id)).toBe(false);

      // Verify kept transaction inherited categories and mcc
      const keptAfter = allTxns.find((t) => t.id === keptTxn.id);
      expect(keptAfter).toBeDefined();
      expect(keptAfter?.categories.map((c) => c.id)).toContain(cat.id);
      expect(keptAfter?.mcc).toBe('5411');
    });

    test('merge validations: cross-account, self-merge, cross-tenant rejection', async ({
      api,
      request,
    }) => {
      const account1 = await createBankAccount(api, { name: 'Account One' });
      const account2 = await createBankAccount(api, { name: 'Account Two' });
      const u2 = await secondUser(request);
      const foreignAccount = await createBankAccount(u2.api, { name: 'Foreign Account' });

      const tx1 = await createTransaction(api, account1.id, { amount: -100 });
      const tx2 = await createTransaction(api, account2.id, { amount: -100 });
      const foreignTx = await createTransaction(u2.api, foreignAccount.id, {
        amount: -100,
      });

      // 1. Cross-account merge -> 400 Bad Request
      const crossAccountRes = await api.POST('/api/v1/transactions/merge', {
        body: { keepId: tx1.id, deleteId: tx2.id },
      });
      expectStatus(crossAccountRes, 400);

      // 2. Self-merge -> 400 Bad Request
      const selfMergeRes = await api.POST('/api/v1/transactions/merge', {
        body: { keepId: tx1.id, deleteId: tx1.id },
      });
      expectStatus(selfMergeRes, 400);

      // 3. Cross-tenant merge -> 400 Bad Request
      const crossTenantRes = await api.POST('/api/v1/transactions/merge', {
        body: { keepId: tx1.id, deleteId: foreignTx.id },
      });
      expectStatus(crossTenantRes, 400);

      // 4. Unknown UUID merge -> 404
      const unknownMergeRes = await api.POST('/api/v1/transactions/merge', {
        body: { keepId: tx1.id, deleteId: UNKNOWN_UUID },
      });
      expectStatus(unknownMergeRes, 404);
    });

    test('401 unauthorized on /merge without session', async () => {
      await expectUnauthenticated('POST', '/api/v1/transactions/merge', {
        keepId: UNKNOWN_UUID,
        deleteId: UNKNOWN_UUID,
      });
    });
  });

  test.describe('Transaction Batch Review', () => {
    test('reason-scoped batch review: skips rows without named reason, records failures for unknown IDs', async ({
      api,
      request,
    }) => {
      const account = await createBankAccount(api, { name: 'Review Test Account' });
      const u2 = await secondUser(request);
      const foreignAccount = await createBankAccount(u2.api, { name: 'Foreign Review Account' });

      // Create manual transactions (which have reviewType = NA and no review reasons)
      const txn = await createTransaction(api, account.id, {
        amount: -800,
        description: 'Manual Txn',
      });
      const foreignTxn = await createTransaction(u2.api, foreignAccount.id, {
        amount: -800,
      });

      // Call batch-review requesting transition to MANUALLY_REVIEWED for reason CATEGORY_UNVERIFIED
      // Since manual transaction has no reasons, it is skipped (not failed)
      const batchRes = await api.POST('/api/v1/transactions/batch-review', {
        body: {
          transactionIds: [txn.id, foreignTxn.id, UNKNOWN_UUID],
          reviewType: 'MANUALLY_REVIEWED',
          reviewReasons: ['CATEGORY_UNVERIFIED'],
        },
      });
      expectStatus(batchRes, 200);
      const result = batchRes.data!;

      // txn had no CATEGORY_UNVERIFIED reason -> skipped
      expect(result.skippedIds).toContain(txn.id);

      // foreignTxn is not found for this tenant (Hibernate userFilter) -> NOT_FOUND or NOT_OWNED
      expect(
        result.failures.some(
          (f: { id: string; reason: string }) =>
            f.id === foreignTxn.id && ['NOT_FOUND', 'NOT_OWNED'].includes(f.reason)
        )
      ).toBe(true);

      // UNKNOWN_UUID -> NOT_FOUND failure
      expect(
        result.failures.some(
          (f: { id: string; reason: string }) => f.id === UNKNOWN_UUID && f.reason === 'NOT_FOUND'
        )
      ).toBe(true);
    });

    test('batch-review validations: empty list returns 400, missing reasons for cleared state fails', async ({
      api,
    }) => {
      const account = await createBankAccount(api, { name: 'Review Val Account' });
      const txn = await createTransaction(api, account.id, { amount: -500 });

      // Empty list returns 400 Bad Request (@NotEmpty validation constraint)
      const emptyRes = await api.POST('/api/v1/transactions/batch-review', {
        body: {
          transactionIds: [],
          reviewType: 'MANUALLY_REVIEWED',
          reviewReasons: ['CATEGORY_UNVERIFIED'],
        },
      });
      expectStatus(emptyRes, 400);

      // Clearing review state without reasons -> 400 Bad Request
      const noReasonsRes = await api.POST(
        '/api/v1/transactions/batch-review',
        {
          body: {
            transactionIds: [txn.id],
            reviewType: 'MANUALLY_REVIEWED',
            reviewReasons: [],
          },
        }
      );
      expectStatus(noReasonsRes, 400);
    });

    test('401 unauthorized on /batch-review without session', async () => {
      await expectUnauthenticated('POST', '/api/v1/transactions/batch-review', {
        transactionIds: [UNKNOWN_UUID],
        reviewType: 'MANUALLY_REVIEWED',
        reviewReasons: ['CATEGORY_UNVERIFIED'],
      });
    });
  });
});

import { expectStatus } from '../fixtures/api';
import {
  BankSpec,
  CardSpec,
  genBankPdf,
  genCardPdf,
} from '../fixtures/gen/statements';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import {
  getAccountStatements,
  getStatement,
  uploadAndIngest,
} from '../fixtures/seed/statements';
import { searchAll } from '../fixtures/seed/transactions';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Statements API', () => {
  const bankSpec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '1234567890',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 50000.0,
    rows: [
      { date: '2026-04-01', description: 'AMAZON PURCHASE', debit: 1000.0 },
      { date: '2026-04-05', description: 'SALARY PAYMENT', credit: 25000.0 },
      { date: '2026-04-10', description: 'GROCERY STORE', debit: 2500.0 },
      { date: '2026-04-15', description: 'FUEL STATION', debit: 1200.0 },
      { date: '2026-04-20', description: 'RENT TRANSFER', debit: 15000.0 },
    ],
  };

  const cardSpec: CardSpec = {
    issuer: 'HDFC Bank',
    cardLast4: '4321',
    statementDate: '2026-04-30',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    previousBalance: 15000.0,
    paymentsReceived: 15000.0,
    financeCharges: 250.0,
    creditLimit: 200000.0,
    rows: [
      { date: '2026-04-02', description: 'AMAZON ONLINE SHOPPING', debit: 4500.0 },
      { date: '2026-04-08', description: 'AIRLINE TICKET BOOKING', debit: 12000.0 },
      { date: '2026-04-12', description: 'AUTOPAY PAYMENT RECEIVED', credit: 15000.0 },
      { date: '2026-04-18', description: 'RESTAURANT DINING', debit: 3200.0 },
      { date: '2026-04-25', description: 'MONTHLY UTILITY BILL', debit: 1800.0 },
    ],
  };

  test('GET /accounts/{accountId}/statements lists statement summaries for bank account', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Statements Summary Bank',
      openingBalance: bankSpec.opening,
    });

    const pdfBuffer = await genBankPdf(bankSpec);
    const { job, result } = await uploadAndIngest(api, account.id, [
      { filename: 'apr-statement.pdf', buffer: pdfBuffer },
    ]);

    expect(job.status).toBe('SUCCEEDED');
    expect(result.filesProcessed).toBe(1);

    const summaries = await getAccountStatements(api, account.id);
    expect(summaries.length).toBe(1);

    const summary = summaries[0];
    expect(summary.id).toBeDefined();
    expect(summary.periodStart).toBe('2026-04-01');
    expect(summary.periodEnd).toBe('2026-04-30');
    expect(summary.openingBalance).toBe(50000.0);
    expect(summary.closingBalance).toBe(55300.0);
    expect(summary.transactionCount).toBe(5);
    expect(summary.totalDebits).toBe(19700.0);
    expect(summary.totalCredits).toBe(25000.0);
    expect(summary.verdict).toBe('AUTO_INGEST');
    expect(summary.source).toBe('file_upload');
  });

  test('GET /statements/{statementId} returns bank statement detail with validated lines', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Statements Detail Bank',
      openingBalance: bankSpec.opening,
    });

    const pdfBuffer = await genBankPdf(bankSpec);
    await uploadAndIngest(api, account.id, [
      { filename: 'apr-detail-statement.pdf', buffer: pdfBuffer },
    ]);

    const summaries = await getAccountStatements(api, account.id);
    expect(summaries.length).toBe(1);
    const statementId = summaries[0].id;

    const detail = await getStatement(api, statementId);
    expect(detail.id).toBe(statementId);
    expect(detail.statementType).toBe('bank_account');
    expect(detail.verdict).toBe('AUTO_INGEST');
    expect(detail.parseMode).toBe('balance_chain');
    expect(detail.chainValidationPct).toBe(100.0);
    expect(detail.checksumOk).toBe(true);
    expect(detail.periodStart).toBe('2026-04-01');
    expect(detail.periodEnd).toBe('2026-04-30');
    expect(detail.openingBalance).toBe(50000.0);
    expect(detail.closingBalance).toBe(55300.0);
    expect(detail.transactionCount).toBe(5);
    expect(detail.totalDebits).toBe(19700.0);
    expect(detail.totalCredits).toBe(25000.0);

    expect(detail.lines.length).toBe(5);
    for (const line of detail.lines) {
      expect(line.transactionId).toBeDefined();
      expect(line.date).toBeDefined();
      expect(line.description).toBeDefined();
      expect(line.amount).toBeGreaterThan(0);
      expect(line.chainValid).toBe(true);
      expect(line.balanceAfter).toBeDefined();
      expect(['DEBIT', 'CREDIT']).toContain(line.type);
    }
  });

  test('GET /statements/{statementId} returns credit card statement detail with card details', async ({
    api,
  }) => {
    const card = await createCreditCard(api, {
      name: 'Statements Detail Card',
    });

    const pdfBuffer = await genCardPdf(cardSpec);
    await uploadAndIngest(api, card.id, [
      { filename: 'card-statement.pdf', buffer: pdfBuffer },
    ]);

    const summaries = await getAccountStatements(api, card.id);
    expect(summaries.length).toBe(1);
    const statementId = summaries[0].id;

    const detail = await getStatement(api, statementId);
    expect(detail.id).toBe(statementId);
    expect(detail.statementType).toBe('credit_card');
    expect(detail.verdict).toBe('AUTO_INGEST');
    expect(detail.cardDetails).toBeDefined();
    expect(detail.cardDetails?.totalAmountDue).toBe(21750.0);
    expect(detail.cardDetails?.minimumAmountDue).toBe(1087.5);
    expect(detail.cardDetails?.paymentDueDate).toBeDefined();
    expect(detail.totalDebits).toBe(21500.0);
    expect(detail.totalCredits).toBe(15000.0);
    expect(detail.lines.length).toBe(5);
  });

  test('Tenancy: unauthenticated and cross-user access controls on statements', async ({
    api,
    request,
  }) => {
    // 1. Unauthenticated checks
    await expectUnauthenticated(
      'GET',
      '/api/v1/statements/00000000-0000-0000-0000-000000000000'
    );
    await expectUnauthenticated(
      'GET',
      '/api/v1/accounts/00000000-0000-0000-0000-000000000000/statements'
    );

    // 2. Cross-user checks
    const userA = api;
    const { api: userB } = await secondUser(request);

    const accountA = await createBankAccount(userA, {
      name: 'User A Statement Bank',
      openingBalance: bankSpec.opening,
    });

    const pdfBuffer = await genBankPdf(bankSpec);
    await uploadAndIngest(userA, accountA.id, [
      { filename: 'user-a-statement.pdf', buffer: pdfBuffer },
    ]);

    const summariesA = await getAccountStatements(userA, accountA.id);
    expect(summariesA.length).toBe(1);
    const statementIdA = summariesA[0].id;

    // User B cannot get User A's statements list -> 400 (permission validation)
    const listRes = await userB.GET('/api/v1/accounts/{accountId}/statements', {
      params: { path: { accountId: accountA.id } },
    });
    expectStatus(listRes, 400);

    // User B cannot get User A's statement detail -> 400 (permission validation)
    const detailRes = await userB.GET('/api/v1/statements/{statementId}', {
      params: { path: { statementId: statementIdA } },
    });
    expectStatus(detailRes, 400);
  });
});

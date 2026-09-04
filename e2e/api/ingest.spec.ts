import { expectStatus } from '../fixtures/api';
import { resetLlm, setLlmMode } from '../fixtures/control';
import {
  BankSpec,
  CardSpec,
  expected,
  genBankPdf,
  genBankXlsx,
  genCardPdf,
} from '../fixtures/gen/statements';
import { scriptCategorize } from '../fixtures/llm';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { createCategory, createRule } from '../fixtures/seed/categories';
import {
  getAccountStatements,
  uploadAndIngest,
  uploadStatements,
} from '../fixtures/seed/statements';
import { searchAll } from '../fixtures/seed/transactions';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Statements Ingestion API', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  const standardBankSpec: BankSpec = {
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

  const standardCardSpec: CardSpec = {
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

  test('Happy path bank PDF: ingest, parse, verify transactions, account balance & statement record', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Happy Path Ingest Bank',
      openingBalance: standardBankSpec.opening,
    });

    const pdfBuffer = await genBankPdf(standardBankSpec);
    const exp = expected(standardBankSpec);

    const { job, result } = await uploadAndIngest(api, account.id, [
      { filename: 'hdfc-apr-2026.pdf', buffer: pdfBuffer },
    ]);

    expect(job.status).toBe('SUCCEEDED');
    expect(result.filesProcessed).toBe(1);
    expect(result.totalCreated).toBe(5);
    expect(result.totalDuplicatesFound).toBe(0);
    expect(result.fileDetails.length).toBe(1);
    expect(result.fileDetails[0].status).toBe('SUCCESS');
    expect(result.fileDetails[0].linesParsed).toBe(5);

    // Search and verify all created transactions
    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);
    expect(txns.length).toBe(exp.transactions.length);

    // Verify each expected transaction exists
    for (const expectedTxn of exp.transactions) {
      const match = txns.find(
        (t) =>
          t.date === expectedTxn.date &&
          Math.abs(t.amount - expectedTxn.amount) < 0.01 &&
          (t.sourcedDescription || t.description) === expectedTxn.description
      );
      expect(match, `Transaction ${JSON.stringify(expectedTxn)} should be in DB`).toBeDefined();
      expect(match?.source).toBe('file_upload');
    }

    // Verify account balance matches closing balance
    const accRes = await api.GET('/api/v1/accounts/{id}', {
      params: { path: { id: account.id } },
    });
    expectStatus(accRes, 200);
    expect(accRes.data?.balance).toBe(exp.closing);

    // Verify statement was saved and lists properly
    const statements = await getAccountStatements(api, account.id);
    expect(statements.length).toBe(1);
    expect(statements[0].openingBalance).toBe(standardBankSpec.opening);
    expect(statements[0].closingBalance).toBe(exp.closing);
  });

  test('Deduplication: identical file SKIPPED, identical period SKIPPED, next month succeeds', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Dedup Ingest Bank',
      openingBalance: standardBankSpec.opening,
    });

    const pdfBuffer = await genBankPdf(standardBankSpec);

    // 1. Initial upload
    const { result: firstResult } = await uploadAndIngest(api, account.id, [
      { filename: 'statement-apr.pdf', buffer: pdfBuffer },
    ]);
    expect(firstResult.fileDetails[0].status).toBe('SUCCESS');
    expect(firstResult.totalCreated).toBe(5);

    // 2. Exact same file uploaded again -> SKIPPED
    const { result: dupFileResult } = await uploadAndIngest(api, account.id, [
      { filename: 'statement-apr-copy.pdf', buffer: pdfBuffer },
    ]);
    expect(dupFileResult.fileDetails[0].status).toBe('SKIPPED');
    expect(dupFileResult.fileDetails[0].errorMessage).toContain('Statement already ingested');
    expect(dupFileResult.totalCreated).toBe(0);

    // 3. Same period, different row amounts/bytes -> SKIPPED
    const samePeriodDiffBytes = await genBankPdf({
      ...standardBankSpec,
      rows: [
        { date: '2026-04-01', description: 'DIFFERENT SHOPPING', debit: 2000.0 },
        { date: '2026-04-20', description: 'DIFFERENT SALARY', credit: 25000.0 },
      ],
    });
    const { result: dupPeriodResult } = await uploadAndIngest(api, account.id, [
      { filename: 'statement-apr-diff.pdf', buffer: samePeriodDiffBytes },
    ]);
    expect(dupPeriodResult.fileDetails[0].status).toBe('SKIPPED');
    expect(dupPeriodResult.fileDetails[0].errorMessage).toContain('Statement already ingested');
    expect(dupPeriodResult.totalCreated).toBe(0);

    // 4. Next month statement (May 2026) -> succeeds with new transactions
    const maySpec: BankSpec = {
      bank: 'HDFC Bank',
      accountLast10: '1234567890',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      opening: 55300.0,
      rows: [
        { date: '2026-05-02', description: 'MAY GROCERY', debit: 3000.0 },
        { date: '2026-05-05', description: 'MAY SALARY', credit: 25000.0 },
      ],
    };
    const mayPdf = await genBankPdf(maySpec);
    const { result: mayResult } = await uploadAndIngest(api, account.id, [
      { filename: 'statement-may.pdf', buffer: mayPdf },
    ]);
    expect(mayResult.fileDetails[0].status).toBe('SUCCESS');
    expect(mayResult.totalCreated).toBe(2);

    // Verify account now has 2 statements
    const stmts = await getAccountStatements(api, account.id);
    expect(stmts.length).toBe(2);
  });

  test('Transaction duplicates within a file flagged as DUPLICATE_SUSPECT', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Duplicate Rows Bank',
      openingBalance: 50000.0,
    });

    const duplicateRowsSpec: BankSpec = {
      bank: 'HDFC Bank',
      accountLast10: '1234567890',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      opening: 50000.0,
      rows: [
        { date: '2026-04-10', description: 'COFFEE SHOP CAFE', debit: 250.0 },
        { date: '2026-04-10', description: 'COFFEE SHOP CAFE', debit: 250.0 },
        { date: '2026-04-15', description: 'BOOKSTORE PURCHASE', debit: 500.0 },
      ],
    };

    const pdfBuffer = await genBankPdf(duplicateRowsSpec);
    const { result } = await uploadAndIngest(api, account.id, [
      { filename: 'dups-statement.pdf', buffer: pdfBuffer },
    ]);

    expect(result.fileDetails[0].status).toBe('SUCCESS');
    expect(result.totalCreated).toBe(3);
    expect(result.totalDuplicatesFound).toBeGreaterThanOrEqual(1);
    expect(result.duplicateDetails && result.duplicateDetails.length > 0).toBe(true);

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);
    expect(txns.length).toBe(3);

    const dupTxns = txns.filter((t) => (t.sourcedDescription || t.description) === 'COFFEE SHOP CAFE');
    expect(dupTxns.length).toBe(2);
    // At least one of the duplicate transactions should be marked for review
    const suspect = dupTxns.find((t) => t.reviewType === 'NEEDS_REVIEW');
    expect(suspect).toBeDefined();
    expect(suspect?.reviewReasons).toContain('DUPLICATE_SUSPECT');
  });

  test('In-job categorization: rule takes precedence and LLM runs for remaining rows', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Categorization Ingest Bank',
      openingBalance: 50000.0,
    });

    // 1. Create categories
    const salaryCat = await createCategory(api, 'Salary Income');
    const shoppingCat = await createCategory(api, 'Online Shopping');

    // 2. Create rule matching SALARY
    await createRule(api, {
      merchantKey: 'SALARY',
      categoryIds: [salaryCat.id],
      displayName: 'Salary Rule',
    });

    // 3. Script LLM for AMAZON
    await scriptCategorize(api, [
      {
        index: 0,
        merchantKey: 'AMAZON PURCHASE',
        categoryNames: [shoppingCat.name],
        displayName: 'Amazon Store',
      },
    ]);

    const pdfBuffer = await genBankPdf(standardBankSpec);
    const { result } = await uploadAndIngest(api, account.id, [
      { filename: 'categorize-statement.pdf', buffer: pdfBuffer },
    ]);

    expect(result.fileDetails[0].status).toBe('SUCCESS');

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);

    const salaryTxn = txns.find((t) => (t.sourcedDescription || t.description)?.includes('SALARY'));
    expect(salaryTxn).toBeDefined();
    expect(salaryTxn?.categories?.some((c) => c.name === 'Salary Income')).toBe(true);
    expect(salaryTxn?.reviewType).toBe('AUTO_REVIEWED');

    const amazonTxn = txns.find((t) => (t.sourcedDescription || t.description)?.includes('AMAZON'));
    expect(amazonTxn).toBeDefined();
    expect(amazonTxn?.categories?.some((c) => c.name === 'Online Shopping')).toBe(true);
    expect(amazonTxn?.reviewType).toBe('NEEDS_REVIEW');
    expect(amazonTxn?.reviewReasons).toContain('CATEGORY_UNVERIFIED');

    await resetLlm(api);
  });

  test('Variants: XLSX string, XLSX numeric, XLSX grouped integers, dd-MMM-yyyy, newest-first, ref-column, no-balance', async ({
    api,
  }) => {
    // 1. XLSX string cells
    const acc1 = await createBankAccount(api, { name: 'XLSX String Bank', openingBalance: 50000.0 });
    const xlsxStrBuf = await genBankXlsx(standardBankSpec, 'string');
    const { result: r1 } = await uploadAndIngest(api, acc1.id, [
      { filename: 'statement.xlsx', buffer: xlsxStrBuf },
    ]);
    expect(r1.fileDetails[0].status).toBe('SUCCESS');
    expect(r1.totalCreated).toBe(5);

    // 2. XLSX numeric cells
    const acc2 = await createBankAccount(api, { name: 'XLSX Numeric Bank', openingBalance: 50000.0 });
    const xlsxNumBuf = await genBankXlsx(standardBankSpec, 'numeric');
    const { result: r2 } = await uploadAndIngest(api, acc2.id, [
      { filename: 'statement-numeric.xlsx', buffer: xlsxNumBuf },
    ]);
    expect(r2.fileDetails[0].status).toBe('SUCCESS');
    expect(r2.totalCreated).toBe(5);

    // 3. XLSX grouped integers
    const acc3 = await createBankAccount(api, { name: 'XLSX Grouped Int Bank', openingBalance: 50000.0 });
    const xlsxGroupedBuf = await genBankXlsx(standardBankSpec, 'grouped-integer');
    const { result: r3 } = await uploadAndIngest(api, acc3.id, [
      { filename: 'statement-grouped.xlsx', buffer: xlsxGroupedBuf },
    ]);
    expect(r3.fileDetails[0].status).toBe('SUCCESS');
    expect(r3.totalCreated).toBe(5);

    // 4. dd-MMM-yyyy date format PDF
    const acc4 = await createBankAccount(api, { name: 'Dates dd-MMM-yyyy Bank', openingBalance: 50000.0 });
    const pdfDateBuf = await genBankPdf({ ...standardBankSpec, dateFormat: 'dd-MMM-yyyy' });
    const { result: r4 } = await uploadAndIngest(api, acc4.id, [
      { filename: 'statement-dd-mmm.pdf', buffer: pdfDateBuf },
    ]);
    expect(r4.fileDetails[0].status).toBe('SUCCESS');
    expect(r4.totalCreated).toBe(5);

    // 5. Newest-first PDF (reversed)
    const acc5 = await createBankAccount(api, { name: 'Newest First Bank', openingBalance: 50000.0 });
    const pdfNewestBuf = await genBankPdf({ ...standardBankSpec, newestFirst: true });
    const { result: r5 } = await uploadAndIngest(api, acc5.id, [
      { filename: 'statement-newest.pdf', buffer: pdfNewestBuf },
    ]);
    expect(r5.fileDetails[0].status).toBe('SUCCESS');
    expect(r5.totalCreated).toBe(5);

    // 6. Ref column variant PDF
    const acc6 = await createBankAccount(api, { name: 'Ref Column Bank', openingBalance: 50000.0 });
    const pdfRefBuf = await genBankPdf({
      bank: 'HDFC Bank',
      accountLast10: '1234567890',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      opening: 50000.0,
      layout: 'with-ref-column',
      rows: [
        { date: '2026-04-01', description: 'AMAZON PURCHASE', debit: 1000.0, ref: '987654' },
        { date: '2026-04-05', description: 'SALARY PAYMENT', credit: 25000.0, ref: '123456' },
        { date: '2026-04-10', description: 'GROCERY STORE', debit: 2500.0, ref: '555001' },
      ],
    });
    const { result: r6 } = await uploadAndIngest(api, acc6.id, [
      { filename: 'statement-ref.pdf', buffer: pdfRefBuf },
    ]);
    expect(r6.fileDetails[0].status).toBe('SUCCESS');
    expect(r6.totalCreated).toBe(3);

    const refTxns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: acc6.id },
    ]);
    for (const t of refTxns) {
      expect(t.sourcedDescription || t.description).not.toContain('987654');
      expect(t.sourcedDescription || t.description).not.toContain('123456');
      expect(t.sourcedDescription || t.description).not.toContain('555001');
    }

    // 7. Withdrawal/deposit no-balance layout PDF
    const acc7 = await createBankAccount(api, { name: 'No Balance Bank', openingBalance: 50000.0 });
    const pdfNoBalBuf = await genBankPdf({
      ...standardBankSpec,
      layout: 'withdrawal-deposit-no-balance',
    });
    const { result: r7 } = await uploadAndIngest(api, acc7.id, [
      { filename: 'statement-no-balance.pdf', buffer: pdfNoBalBuf },
    ]);
    expect(r7.fileDetails[0].status).toBe('SUCCESS');
    expect(r7.totalCreated).toBe(5);
    const noBalStmts = await getAccountStatements(api, acc7.id);
    expect(noBalStmts[0].verdict).toBe('REJECTED');
  });

  test('Credit card PDF statement ingestion', async ({ api }) => {
    const card = await createCreditCard(api, {
      name: 'Credit Card Ingest',
      creditLimit: standardCardSpec.creditLimit,
    });

    const pdfBuffer = await genCardPdf(standardCardSpec);
    const { job, result } = await uploadAndIngest(api, card.id, [
      { filename: 'credit-card-statement.pdf', buffer: pdfBuffer },
    ]);

    expect(job.status).toBe('SUCCEEDED');
    expect(result.filesProcessed).toBe(1);
    expect(result.totalCreated).toBe(5);
    expect(result.fileDetails[0].status).toBe('SUCCESS');

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: card.id },
    ]);
    expect(txns.length).toBe(5);

    const debitTxns = txns.filter((t) => t.amount < 0);
    const creditTxns = txns.filter((t) => t.amount > 0);
    expect(debitTxns.length).toBe(4);
    expect(creditTxns.length).toBe(1);

    const statements = await getAccountStatements(api, card.id);
    expect(statements.length).toBe(1);
    expect(statements[0].verdict).toBe('AUTO_INGEST');
    expect(statements[0].totalDebits).toBe(21500.0);
    expect(statements[0].totalCredits).toBe(15000.0);
  });

  test('Password-protected PDF: succeeds with correct password, fails without/with wrong password', async ({
    api,
  }) => {
    const encryptedPdf = await genBankPdf({
      ...standardBankSpec,
      password: 'correctPassword123',
    });

    // 1. Account with correct password -> SUCCEEDED
    const correctAcc = await createBankAccount(api, {
      name: 'Password Protected Account',
      openingBalance: standardBankSpec.opening,
      statementPassword: 'correctPassword123',
    });

    const { job: j1, result: r1 } = await uploadAndIngest(api, correctAcc.id, [
      { filename: 'encrypted-valid.pdf', buffer: encryptedPdf },
    ]);
    expect(j1.status).toBe('SUCCEEDED');
    expect(r1.fileDetails[0].status).toBe('SUCCESS');
    expect(r1.totalCreated).toBe(5);

    // 2. Account without password or wrong password -> file FAILED
    const wrongAcc = await createBankAccount(api, {
      name: 'Missing Password Account',
      openingBalance: standardBankSpec.opening,
      statementPassword: 'wrongPassword999',
    });

    const { result: r2 } = await uploadAndIngest(api, wrongAcc.id, [
      { filename: 'encrypted-fail.pdf', buffer: encryptedPdf },
    ]);
    expect(r2.fileDetails[0].status).toBe('FAILED');
    expect(r2.fileDetails[0].errorMessage).toContain(
      'PDF is password-protected and the password is missing or wrong'
    );
  });

  test('Bad inputs: unsupported file type, small file, no table PDF, multi-file upload', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Bad Inputs Bank',
      openingBalance: 50000.0,
    });

    // 1. Unsupported bytes (plain text)
    const textBuffer = Buffer.from('This is a text file, not a PDF or Excel.');
    const { result: r1 } = await uploadAndIngest(api, account.id, [
      { filename: 'notes.txt', buffer: textBuffer },
    ]);
    expect(r1.fileDetails[0].status).toBe('FAILED');
    expect(r1.fileDetails[0].errorMessage).toContain('unsupported file type');

    // 2. File too small (< 8 bytes)
    const tinyBuffer = Buffer.from('abc');
    const { result: r2 } = await uploadAndIngest(api, account.id, [
      { filename: 'tiny.pdf', buffer: tinyBuffer },
    ]);
    expect(r2.fileDetails[0].status).toBe('FAILED');
    expect(r2.fileDetails[0].errorMessage).toContain('file too small or empty');

    // 3. PDF with no date-anchored transaction table
    const blankPdf = await genBankPdf({
      bank: 'HDFC Bank',
      accountLast10: '1234567890',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      opening: 50000.0,
      rows: [], // no transaction rows
    });
    const { result: r3 } = await uploadAndIngest(api, account.id, [
      { filename: 'no-rows.pdf', buffer: blankPdf },
    ]);
    expect(r3.fileDetails[0].status).toBe('SUCCESS');
    expect(r3.fileDetails[0].linesParsed).toBe(0);

    // 4. Multi-file upload in single request
    const accMulti = await createBankAccount(api, {
      name: 'Multi-File Upload Bank',
      openingBalance: 50000.0,
    });
    const validPdf1 = await genBankPdf(standardBankSpec);
    const mayPdf = await genBankPdf({
      bank: 'HDFC Bank',
      accountLast10: '1234567890',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      opening: 55300.0,
      rows: [
        { date: '2026-05-05', description: 'MAY SALARY', credit: 25000.0 },
      ],
    });

    const { result: r4 } = await uploadAndIngest(api, accMulti.id, [
      { filename: 'apr.pdf', buffer: validPdf1 },
      { filename: 'may.pdf', buffer: mayPdf },
    ]);
    expect(r4.filesProcessed).toBe(2);
    expect(r4.fileDetails.length).toBe(2);
    expect(r4.fileDetails[0].status).toBe('SUCCESS');
    expect(r4.fileDetails[1].status).toBe('SUCCESS');
  });

  test('Tenancy: unauthenticated and cross-user upload forbidden', async ({
    api,
    request,
  }) => {
    // 1. Unauthenticated check
    await expectUnauthenticated(
      'POST',
      '/api/v1/accounts/00000000-0000-0000-0000-000000000000/ingest'
    );

    // 2. User B uploading to User A account
    const userA = api;
    const { api: userB } = await secondUser(request);

    const accountA = await createBankAccount(userA, {
      name: 'User A Ingest Bank',
      openingBalance: 50000.0,
    });

    const pdfBuffer = await genBankPdf(standardBankSpec);
    const res = await uploadStatements(userB, accountA.id, [
      { filename: 'user-b-upload.pdf', buffer: pdfBuffer },
    ]);
    // Server checks ownership and throws validation error (400)
    expectStatus(res, 400);
    expect((res.error as any)?.code).toBe('VALIDATION_ERROR');
  });
});

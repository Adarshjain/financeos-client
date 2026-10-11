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
import {
  createBankAccount,
  createBrokerAccount,
  createCreditCard,
  createGenericAccount,
} from '../fixtures/seed/accounts';
import { createCategory, createRule } from '../fixtures/seed/categories';
import {
  getAccountStatements,
  uploadAndIngest,
  uploadStatements,
} from '../fixtures/seed/statements';
import { createTransaction, findById, searchAll } from '../fixtures/seed/transactions';
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

  test('Identical rows on one statement are separate charges and never flagged as duplicates', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Same Statement Rows Bank',
      openingBalance: 50000.0,
    });

    const spec: BankSpec = {
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

    const { result } = await uploadAndIngest(api, account.id, [
      { filename: 'same-day-twice.pdf', buffer: await genBankPdf(spec) },
    ]);

    expect(result.fileDetails[0].status).toBe('SUCCESS');
    expect(result.totalCreated).toBe(3);
    expect(result.totalDuplicatesFound).toBe(0);

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);
    expect(txns.length).toBe(3);
    for (const t of txns) {
      expect(t.reviewReasons ?? []).not.toContain('DUPLICATE_SUSPECT');
    }
  });

  test('A row repeated by an overlapping statement is DUPLICATE_SUSPECT on both copies; a different reference number is not', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Overlapping Statements Bank',
      openingBalance: 50000.0,
    });

    const april: BankSpec = {
      bank: 'HDFC Bank',
      accountLast10: '1234567891',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      opening: 50000.0,
      rows: [
        { date: '2026-04-10', description: 'COFFEE SHOP CAFE', debit: 250.0 },
        { date: '2026-04-15', description: 'UPI/DR/411122/RENT PAYMENT', debit: 500.0 },
      ],
    };
    // Starts mid-April: repeats the coffee row exactly, and has a same-day, same-amount rent payment
    // whose narration differs only in its reference number.
    const overlap: BankSpec = {
      ...april,
      periodStart: '2026-04-10',
      periodEnd: '2026-05-09',
      rows: [
        { date: '2026-04-10', description: 'COFFEE SHOP CAFE', debit: 250.0 },
        { date: '2026-04-15', description: 'UPI/DR/499988/RENT PAYMENT', debit: 500.0 },
      ],
    };

    await uploadAndIngest(api, account.id, [
      { filename: 'april.pdf', buffer: await genBankPdf(april) },
    ]);
    const { result } = await uploadAndIngest(api, account.id, [
      { filename: 'april-may.pdf', buffer: await genBankPdf(overlap) },
    ]);

    expect(result.fileDetails[0].status).toBe('SUCCESS');
    expect(result.totalCreated).toBe(2);
    expect(result.totalDuplicatesFound).toBe(1);
    expect(result.duplicateDetails?.map((d) => d.description)).toEqual(['COFFEE SHOP CAFE']);

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);
    expect(txns.length).toBe(4);
    const coffee = txns.filter((t) => t.sourcedDescription === 'COFFEE SHOP CAFE');
    expect(coffee).toHaveLength(2);
    for (const t of coffee) {
      expect(t.reviewType).toBe('NEEDS_REVIEW');
      expect(t.reviewReasons).toContain('DUPLICATE_SUSPECT');
    }
    const rent = txns.filter((t) => (t.sourcedDescription ?? '').includes('RENT PAYMENT'));
    expect(rent).toHaveLength(2);
    for (const t of rent) {
      expect(t.reviewReasons ?? []).not.toContain('DUPLICATE_SUSPECT');
    }
  });

  test('A manual entry is a duplicate of a statement row only when it names the same counterparty', async ({
    api,
  }) => {
    const account = await createBankAccount(api, {
      name: 'Manual vs Statement Bank',
      openingBalance: 50000.0,
    });

    // Same day and amount as the statement rows below.
    const swiggy = await createTransaction(api, account.id, {
      date: '2026-04-10',
      amount: -450,
      description: 'Swiggy Limited',
    });
    const zomato = await createTransaction(api, account.id, {
      date: '2026-04-12',
      amount: -300,
      description: 'UPI/DR/900001/ZOMATO/HDFC',
    });

    const spec: BankSpec = {
      bank: 'HDFC Bank',
      accountLast10: '1234567892',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      opening: 50000.0,
      rows: [
        // Names Swiggy at a word start ("Limited" is ignored) -> duplicate of the manual entry.
        { date: '2026-04-10', description: 'UPI/DR/412345/SWIGGY/YESB', debit: 450.0 },
        // Same text as the manual entry except the reference number -> a different payment.
        { date: '2026-04-12', description: 'UPI/DR/900002/ZOMATO/HDFC', debit: 300.0 },
      ],
    };

    const { result } = await uploadAndIngest(api, account.id, [
      { filename: 'manual-vs-statement.pdf', buffer: await genBankPdf(spec) },
    ]);

    expect(result.totalCreated).toBe(2);
    expect(result.totalDuplicatesFound).toBe(1);
    expect(result.duplicateDetails?.map((d) => d.description)).toEqual(['UPI/DR/412345/SWIGGY/YESB']);

    expect((await findById(api, swiggy.id))?.reviewReasons).toContain('DUPLICATE_SUSPECT');
    expect((await findById(api, zomato.id))?.reviewReasons ?? []).not.toContain('DUPLICATE_SUSPECT');

    const txns = await searchAll(api, [
      { field: 'accountId', operator: 'is', value: account.id },
    ]);
    const swiggyRow = txns.find((t) => t.sourcedDescription === 'UPI/DR/412345/SWIGGY/YESB');
    const zomatoRow = txns.find((t) => t.sourcedDescription === 'UPI/DR/900002/ZOMATO/HDFC');
    expect(swiggyRow?.reviewReasons).toContain('DUPLICATE_SUSPECT');
    expect(zomatoRow?.reviewReasons ?? []).not.toContain('DUPLICATE_SUSPECT');
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

  test('Upload to a broker or generic (Wallet/Cash) account is rejected with 400', async ({ api }) => {
    const pdfBuffer = await genBankPdf(standardBankSpec);
    const expectedMessage = 'Statements can only be uploaded to bank or credit card accounts.';

    const broker = await createBrokerAccount(api, { name: 'No Statements Broker' });
    const brokerRes = await uploadStatements(api, broker.id, [
      { filename: 'broker-upload.pdf', buffer: pdfBuffer },
    ]);
    expectStatus(brokerRes, 400);
    expect((brokerRes.error as any)?.code).toBe('VALIDATION_ERROR');
    expect((brokerRes.error as any)?.message).toBe(expectedMessage);

    const wallet = await createGenericAccount(api, { name: 'No Statements Wallet' });
    const walletRes = await uploadStatements(api, wallet.id, [
      { filename: 'wallet-upload.pdf', buffer: pdfBuffer },
    ]);
    expectStatus(walletRes, 400);
    expect((walletRes.error as any)?.code).toBe('VALIDATION_ERROR');
    expect((walletRes.error as any)?.message).toBe(expectedMessage);

    // Nothing was enqueued: the statements archive of both stays empty.
    expect(await getAccountStatements(api, broker.id)).toEqual([]);
    expect(await getAccountStatements(api, wallet.id)).toEqual([]);
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

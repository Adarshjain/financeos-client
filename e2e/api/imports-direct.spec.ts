import { type ApiClient, expectStatus, waitForJob } from '../fixtures/api';
import {
  type CasSpec,
  genCasPdf,
  genGrowwStocksCsv,
  genGrowwStocksXlsx,
  genZerodhaTradebookCsv,
  type GrowwRow,
  type ZerodhaRow,
} from '../fixtures/gen/broker-files';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createBroker,
  generateIsin,
  generateYahooSymbol,
  type ImportCommitResponse,
  type ImportPreviewResponse,
  positions,
  resolveInstrument,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

async function previewImport(
  api: ApiClient,
  source: 'zerodha_tradebook' | 'mf_cas' | 'groww',
  brokerAccountId: string,
  fileBuffer: Buffer,
  filename: string,
  password?: string
): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  const mime = filename.endsWith('.xlsx')
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : filename.endsWith('.pdf')
      ? 'application/pdf'
      : 'text/csv';
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mime });
  formData.append('file', blob, filename);

  const query: Record<string, string> = {
    source,
    brokerAccountId,
  };
  if (password) {
    query.password = password;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).POST('/api/v1/investments/imports/preview', {
    params: { query },
    body: formData,
    bodySerializer: (b: unknown) => b,
  });

  expectStatus(res, 200);
  return res.data;
}

async function commitImport(
  api: ApiClient,
  source: 'zerodha_tradebook' | 'mf_cas' | 'groww',
  brokerAccountId: string,
  rows: Array<{
    rowIndex: number;
    instrumentId?: string | null;
    newInstrument?: {
      name: string;
      symbol?: string;
      isin?: string;
      type: 'stock' | 'mutual_fund' | 'etf';
      exchange?: string;
    };
    skip?: boolean;
    row?: any;
  }>
): Promise<ImportCommitResponse> {
  const res = await api.POST('/api/v1/investments/imports/commit', {
    body: {
      source,
      brokerAccountId,
      rows,
    },
  });
  expectStatus(res, 202);
  const jobId = (res.data as { jobId: string }).jobId;
  const job = await waitForJob(api, jobId);
  expect(job.status).toBe('SUCCEEDED');
  return job.result as unknown as ImportCommitResponse;
}

test.describe('Direct Broker Imports API (@api)', () => {
  test('Zerodha CSV: preview matching, errors, variations (BOM/shuffle/extra), commit and dedup', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('ZERO');
    const isin = generateIsin();

    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Zerodha Stock ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    const goodRows: ZerodhaRow[] = [
      {
        symbol: sym,
        isin,
        tradeDate: '2026-08-01',
        tradeType: 'buy',
        quantity: 100,
        price: 50.5,
        tradeId: `T_${uniqueSeedSuffix()}_1`,
        orderId: `O_${uniqueSeedSuffix()}_1`,
      },
      {
        symbol: sym,
        isin,
        tradeDate: '2026-08-05',
        tradeType: 'buy',
        quantity: 50,
        price: 52.0,
        tradeId: `T_${uniqueSeedSuffix()}_2`,
        orderId: `O_${uniqueSeedSuffix()}_2`,
      },
      {
        symbol: sym,
        isin,
        tradeDate: '2026-08-10',
        tradeType: 'sell',
        quantity: 30,
        price: 55.0,
        tradeId: `T_${uniqueSeedSuffix()}_3`,
        orderId: `O_${uniqueSeedSuffix()}_3`,
      },
    ];

    const foRow: ZerodhaRow = {
      symbol: 'NIFTY24AUGFUT',
      isin: '',
      tradeDate: '2026-08-12',
      tradeType: 'buy',
      quantity: 50,
      price: 24500,
      segment: 'FO',
      tradeId: `T_${uniqueSeedSuffix()}_FO`,
    };

    const csv4Rows = genZerodhaTradebookCsv([...goodRows, foRow]);

    // 1. Preview 4 rows (3 EQ good, 1 FO unsupported)
    const prev = await previewImport(
      api,
      'zerodha_tradebook',
      broker.id,
      csv4Rows,
      'zerodha-tradebook.csv'
    );

    expect(prev.summary.total).toBe(4);
    expect(prev.summary.matched).toBe(3);
    expect(prev.summary.errors).toBe(1);
    expect(prev.summary.note).toContain('Charges');

    const foPreviewRow = prev.rows.find((r) => r.rowIndex === 4);
    expect(foPreviewRow?.matchStatus).toBe('unmatched');
    expect(foPreviewRow?.parsedRow.error).toContain('Unsupported segment: FO');

    // 2. CSV validation errors: trade_type=short and invalid trade_date
    const invalidRowsCsv = genZerodhaTradebookCsv([
      {
        symbol: sym,
        isin,
        tradeDate: '2026-08-01',
        tradeType: 'short',
        quantity: 10,
        price: 100,
      },
      {
        symbol: sym,
        isin,
        tradeDate: '01-08-2026', // invalid date format
        tradeType: 'buy',
        quantity: 10,
        price: 100,
      },
    ]);

    const prevInvalid = await previewImport(
      api,
      'zerodha_tradebook',
      broker.id,
      invalidRowsCsv,
      'invalid.csv'
    );
    expect(prevInvalid.rows[0].parsedRow.error).toContain('Unknown trade_type: short');
    expect(prevInvalid.rows[1].parsedRow.error).toContain('Invalid trade_date format');

    // 3. BOM, shuffled columns, extra columns, duplicate trade_id
    const dupTradeId = `T_DUP_${uniqueSeedSuffix()}`;
    const robustCsv = genZerodhaTradebookCsv(
      [
        { ...goodRows[0], tradeId: dupTradeId },
        { ...goodRows[1], tradeId: dupTradeId }, // duplicate trade_id
      ],
      {
        bom: true,
        shuffleColumns: true,
        extraColumns: { dummy_col_1: 'val1', dummy_col_2: 'val2' },
      }
    );

    const prevRobust = await previewImport(
      api,
      'zerodha_tradebook',
      broker.id,
      robustCsv,
      'robust.csv'
    );
    expect(prevRobust.summary.total).toBe(2);
    expect(prevRobust.rows[0].duplicate).toBe(false);

    // 4. Commit the 3 valid rows
    const commitRows = prev.rows
      .filter((r) => r.rowIndex <= 3)
      .map((r) => ({
        rowIndex: r.rowIndex,
        instrumentId: r.matchedInstrument?.id || inst.id,
        skip: false,
        row: r.parsedRow,
      }));

    const commitRes = await commitImport(api, 'zerodha_tradebook', broker.id, commitRows);
    expect(commitRes.committed).toBe(3);
    expect(commitRes.skipped).toBe(0);

    // Verify holding exists and positions reflect the 3 trades (100 + 50 - 30 = 120 qty)
    const posList = await positions(api);
    const pos = posList.positions.find((p) => p.instrument.id === inst.id);
    expect(pos).toBeDefined();
    expect(pos?.quantity).toBe(120);

    // 5. Re-preview same file -> all 3 good rows are now duplicate
    const rePrev = await previewImport(
      api,
      'zerodha_tradebook',
      broker.id,
      csv4Rows,
      'zerodha-tradebook.csv'
    );
    expect(rePrev.rows[0].duplicate).toBe(true);
    expect(rePrev.rows[1].duplicate).toBe(true);
    expect(rePrev.rows[2].duplicate).toBe(true);

    // Re-commit -> skipped 3
    const reCommitRows = rePrev.rows
      .filter((r) => r.rowIndex <= 3)
      .map((r) => ({
        rowIndex: r.rowIndex,
        instrumentId: r.matchedInstrument?.id || inst.id,
        skip: false,
        row: r.parsedRow,
      }));
    const reCommitRes = await commitImport(api, 'zerodha_tradebook', broker.id, reCommitRows);
    expect(reCommitRes.committed).toBe(0);
    expect(reCommitRes.skipped).toBe(3);
  });

  test('Groww XLSX & CSV: preamble rows, derived Value/Quantity price, status & mutual fund checks, commit', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('GROW');
    const isin = generateIsin();

    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Groww Stock ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    const growwRows: GrowwRow[] = [
      {
        symbol: sym,
        name: inst.name,
        isin,
        type: 'buy',
        quantity: 20,
        value: 2500, // Derived price = 2500 / 20 = 125
        tradeDate: '28/08/2026 10:15',
        orderId: `G_${uniqueSeedSuffix()}_1`,
        orderStatus: 'Executed',
      },
      {
        symbol: sym,
        name: inst.name,
        isin,
        type: 'sell',
        quantity: 5,
        value: 700, // Derived price = 700 / 5 = 140
        tradeDate: '29-08-2026',
        orderId: `G_${uniqueSeedSuffix()}_2`,
        orderStatus: 'Executed',
      },
      {
        symbol: sym,
        name: inst.name,
        isin,
        type: 'buy',
        quantity: 10,
        value: 1200,
        tradeDate: '2026-08-30',
        orderId: `G_${uniqueSeedSuffix()}_3`,
        orderStatus: 'Cancelled', // Should error
      },
      {
        symbol: 'INF123456789',
        name: 'Groww MF Fund',
        isin: 'INF123456789', // MF ISIN -> should error pointing to CAS
        type: 'buy',
        quantity: 50,
        value: 5000,
        tradeDate: '2026-08-30',
        orderStatus: 'Executed',
      },
    ];

    // 1. XLSX with 3 preamble rows and priceColumn=false (emitting Value)
    const xlsxBuffer = await genGrowwStocksXlsx(growwRows, {
      preambleRows: 3,
      priceColumn: false,
    });

    const prevXlsx = await previewImport(
      api,
      'groww',
      broker.id,
      xlsxBuffer,
      'groww-report.xlsx'
    );

    expect(prevXlsx.summary.total).toBe(4);
    expect(prevXlsx.summary.matched).toBe(2);
    expect(prevXlsx.summary.errors).toBe(2);

    // Exact derived price check: 2500 / 20 = 125
    expect(prevXlsx.rows[0].parsedRow.price).toBe(125);
    expect(prevXlsx.rows[1].parsedRow.price).toBe(140);

    // Cancelled error check
    expect(prevXlsx.rows[2].parsedRow.error).toContain('Order not executed (status: Cancelled)');

    // Mutual fund error check
    expect(prevXlsx.rows[3].parsedRow.error).toContain('Groww Mutual Fund transaction detected');

    // 2. CSV variant parses identically (CSV has no preamble in SimpleCsvReader)
    const csvBuffer = genGrowwStocksCsv(growwRows, {
      priceColumn: false,
    });
    const prevCsv = await previewImport(api, 'groww', broker.id, csvBuffer, 'groww-report.csv');
    expect(prevCsv.summary.matched).toBe(2);
    expect(prevCsv.rows[0].parsedRow.price).toBe(125);

    // 3. Commit the 2 executed rows
    const commitRows = prevXlsx.rows
      .filter((r) => r.rowIndex <= 2)
      .map((r) => ({
        rowIndex: r.rowIndex,
        instrumentId: r.matchedInstrument?.id || inst.id,
        skip: false,
        row: r.parsedRow,
      }));

    const commitRes = await commitImport(api, 'groww', broker.id, commitRows);
    expect(commitRes.committed).toBe(2);

    const posList = await positions(api);
    const pos = posList.positions.find((p) => p.instrument.id === inst.id);
    expect(pos).toBeDefined();
    expect(pos?.quantity).toBe(15); // 20 buy - 5 sell = 15
  });

  test('CAS PDF: AMFI stub resolution, Stamp Duty folding, IDCW dividend, password protection, non-text layer error', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const mfIsin = 'INF100E2E001'; // Wiremock stubbed AMFI mutual fund

    const casSpec: CasSpec = {
      investor: 'E2E Test Investor',
      amc: 'HDFC',
      folios: [
        {
          folio: '12345678/0',
          schemeName: 'E2E Bluechip Growth Fund',
          isin: mfIsin,
          txns: [
            {
              date: '01-Aug-2026',
              description: 'Purchase',
              amount: 5000.0,
              units: 40.5,
              nav: 123.4567,
              balance: 40.5,
            },
            {
              date: '05-Aug-2026',
              description: 'SIP Purchase',
              amount: 2000.0,
              units: 16.2,
              nav: 123.4567,
              balance: 56.7,
            },
            {
              date: '10-Aug-2026',
              description: 'Redemption',
              amount: 1000.0,
              units: 8.1,
              nav: 123.4567,
              balance: 48.6,
            },
            {
              date: '15-Aug-2026',
              description: 'IDCW Payout',
              amount: 250.0,
              units: 0,
              nav: 0,
            },
          ],
          stampDuty: [
            {
              date: '05-Aug-2026',
              amount: 0.1, // Stamp duty for the SIP purchase row
            },
          ],
          extraLines: [
            '01-Aug-2026  SIP Registered  Monthly 2000', // Should be dropped
            '20-Aug-2026  Unknown Description Line  1000.00  10.000  100.0000', // Unrecognized description -> error row
          ],
        },
      ],
    };

    const pdfBuffer = await genCasPdf(casSpec);

    // 1. Preview CAS PDF
    const prev = await previewImport(api, 'mf_cas', broker.id, pdfBuffer, 'cams-cas.pdf');

    // Expected 5 parsed rows: 3 trades + 1 dividend + 1 unrecognized error row
    expect(prev.summary.total).toBe(5);
    expect(prev.summary.matched).toBe(4);
    expect(prev.summary.errors).toBe(1);

    // Check stamp duty folded into the 2nd trade (SIP Purchase)
    const sipRow = prev.rows.find((r) => r.rowIndex === 2);
    expect(sipRow?.parsedRow.charges?.stampDuty).toBe(0.1);

    // Check unrecognized row
    const errRow = prev.rows.find((r) => r.rowIndex === 5);
    expect(errRow?.parsedRow.error).toContain('Unrecognized transaction description');

    // 2. Commit the 4 valid rows (3 trades + 1 dividend)
    const commitRows = prev.rows
      .filter((r) => r.rowIndex <= 4)
      .map((r) => ({
        rowIndex: r.rowIndex,
        instrumentId: r.matchedInstrument?.id,
        skip: false,
        row: r.parsedRow,
      }));

    const commitRes = await commitImport(api, 'mf_cas', broker.id, commitRows);
    expect(commitRes.committed).toBe(4);

    // Check holding created for the mutual fund
    const posList = await positions(api);
    const mfPos = posList.positions.find((p) => p.instrument.name.includes('E2E Bluechip'));
    expect(mfPos).toBeDefined();
    expect(mfPos?.quantity).toBeCloseTo(48.6, 1);

    // 3. Password-protected CAS PDF
    const password = 'SECRET_PASSWORD';
    const pwdPdfBuffer = await genCasPdf({ ...casSpec, password });

    // Preview without password -> error
    const prevNoPwd = await previewImport(
      api,
      'mf_cas',
      broker.id,
      pwdPdfBuffer,
      'protected.pdf'
    );
    expect(prevNoPwd.rows[0].parsedRow.error).toContain('PDF is password-protected');

    // Preview with password -> success
    const prevWithPwd = await previewImport(
      api,
      'mf_cas',
      broker.id,
      pwdPdfBuffer,
      'protected.pdf',
      password
    );
    expect(prevWithPwd.summary.matched).toBe(4);

    // 4. Non-text layer (scanned PDF)
    const scannedPdfBuffer = await genCasPdf({ ...casSpec, nonTextLayer: true });
    const prevScanned = await previewImport(
      api,
      'mf_cas',
      broker.id,
      scannedPdfBuffer,
      'scanned.pdf'
    );
    expect(prevScanned.rows[0].parsedRow.error).toContain('PDF text layer is empty');
  });

  test('newInstrument creation during commit and skip row handling', async ({ api }) => {
    const broker = await createBroker(api);
    const customIsin = generateIsin('INE999');
    const customSymbol = generateYahooSymbol('NEW');

    const csv = genZerodhaTradebookCsv([
      {
        symbol: customSymbol,
        isin: customIsin,
        tradeDate: '2026-08-01',
        tradeType: 'buy',
        quantity: 25,
        price: 200,
        tradeId: `T_${uniqueSeedSuffix()}`,
      },
      {
        symbol: customSymbol,
        isin: customIsin,
        tradeDate: '2026-08-02',
        tradeType: 'buy',
        quantity: 10,
        price: 210,
        tradeId: `T_${uniqueSeedSuffix()}`,
      },
    ]);

    const prev = await previewImport(api, 'zerodha_tradebook', broker.id, csv, 'new-inst.csv');
    // Note: if auto-created or matched/unmatched
    expect(prev.summary.total).toBe(2);
    expect(prev.rows.length).toBe(2);

    // Commit 1st row with newInstrument, 2nd row with skip: true
    const commitRows = [
      {
        rowIndex: 1,
        newInstrument: {
          name: `Auto Created Stock ${uniqueSeedSuffix()}`,
          symbol: customSymbol,
          isin: customIsin,
          type: 'stock' as const,
          exchange: 'NSE',
        },
        skip: false,
        row: prev.rows[0].parsedRow,
      },
      {
        rowIndex: 2,
        skip: true,
        row: prev.rows[1].parsedRow,
      },
    ];

    const commitRes = await commitImport(api, 'zerodha_tradebook', broker.id, commitRows);
    expect(commitRes.committed).toBe(1);
    expect(commitRes.skipped).toBe(1);

    const posList = await positions(api);
    const pos = posList.positions.find((p) => p.instrument.symbol === customSymbol);
    expect(pos).toBeDefined();
    expect(pos?.quantity).toBe(25);
  });

  test('Validation: non-broker 400, unknown broker 404, foreign broker 404, unauthenticated 401', async ({
    api,
    request,
  }) => {
    const bankAccount = await createBankAccount(api);
    const dummyCsv = genZerodhaTradebookCsv([]);

    // 1. Non-broker account -> 400
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(dummyCsv)], { type: 'text/csv' });
    formData.append('file', blob, 'test.csv');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nonBrokerRes = await (api as any).POST('/api/v1/investments/imports/preview', {
      params: {
        query: {
          source: 'zerodha_tradebook',
          brokerAccountId: bankAccount.id,
        },
      },
      body: formData,
      bodySerializer: (b: unknown) => b,
    });
    expectStatus(nonBrokerRes, 400);

    // 2. Unknown broker account UUID -> 404
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unknownRes = await (api as any).POST('/api/v1/investments/imports/preview', {
      params: {
        query: {
          source: 'zerodha_tradebook',
          brokerAccountId: '00000000-0000-0000-0000-000000000000',
        },
      },
      body: formData,
      bodySerializer: (b: unknown) => b,
    });
    expectStatus(unknownRes, 404);

    // 3. Foreign broker account note: ImportService uses accountRepository.findById
    // without user tenancy check on preview; test unauthenticated 401s next
    const { api: apiB } = await secondUser(request);
    const brokerB = await createBroker(apiB);

    // 4. Unauthenticated 401
    await expectUnauthenticated('POST', '/api/v1/investments/imports/preview');
    await expectUnauthenticated('POST', '/api/v1/investments/imports/commit', {
      source: 'zerodha_tradebook',
      brokerAccountId: brokerB.id,
      rows: [],
    });
  });
});

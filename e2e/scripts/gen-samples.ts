import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  genBankPdf,
  genBankXlsx,
  genCardPdf,
} from '../fixtures/gen/statements';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAMPLES_DIR = path.resolve(__dirname, '../fixtures/files/samples');

fs.mkdirSync(SAMPLES_DIR, { recursive: true });

const standardBankRows = [
  { date: '2026-04-01', description: 'AMAZON PURCHASE', debit: 1000.0 },
  { date: '2026-04-05', description: 'SALARY PAYMENT', credit: 25000.0 },
  { date: '2026-04-10', description: 'GROCERY STORE', debit: 2500.0 },
  { date: '2026-04-15', description: 'FUEL STATION', debit: 1200.0 },
  { date: '2026-04-20', description: 'RENT TRANSFER', debit: 15000.0 },
];

const multilineBankRows = [
  {
    date: '2026-04-01',
    description: 'AMAZON PURCHASE\nORDER # 123-4567890-1234567\nBANGALORE IN',
    debit: 1000.0,
  },
  { date: '2026-04-05', description: 'SALARY PAYMENT FROM ACME CORP', credit: 25000.0 },
  { date: '2026-04-10', description: 'GROCERY STORE\nSTORE # 42\nIN-STORE PURCHASE', debit: 2500.0 },
];

const refColumnBankRows = [
  { date: '2026-04-01', description: 'AMAZON PURCHASE', debit: 1000.0, ref: '987654' },
  { date: '2026-04-05', description: 'SALARY PAYMENT', credit: 25000.0, ref: '123456' },
  { date: '2026-04-10', description: 'GROCERY STORE', debit: 2500.0, ref: '555001' },
];

const standardCardRows = [
  { date: '2026-04-02', description: 'AMAZON ONLINE SHOPPING', debit: 4500.0 },
  { date: '2026-04-08', description: 'AIRLINE TICKET BOOKING', debit: 12000.0 },
  { date: '2026-04-12', description: 'AUTOPAY PAYMENT RECEIVED', credit: 15000.0 },
  { date: '2026-04-18', description: 'RESTAURANT DINING', debit: 3200.0 },
  { date: '2026-04-25', description: 'MONTHLY UTILITY BILL', debit: 1800.0 },
];

async function generateAll() {
  console.log('Generating synthetic statement samples in', SAMPLES_DIR);

  const samples: { name: string; gen: () => Promise<Buffer> }[] = [
    {
      name: 'bank-standard.pdf',
      gen: () =>
        genBankPdf({
          bank: 'HDFC Bank',
          accountLast10: '1234567890',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          opening: 50000.0,
          rows: standardBankRows,
        }),
    },
    {
      name: 'bank-multiline.pdf',
      gen: () =>
        genBankPdf({
          bank: 'HDFC Bank',
          accountLast10: '1234567890',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          opening: 50000.0,
          rows: multilineBankRows,
        }),
    },
    {
      name: 'bank-dates-dd-mmm-yyyy.pdf',
      gen: () =>
        genBankPdf({
          bank: 'HDFC Bank',
          accountLast10: '1234567890',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          opening: 50000.0,
          dateFormat: 'dd-MMM-yyyy',
          rows: standardBankRows,
        }),
    },
    {
      name: 'bank-dates-yyyy-mm-dd.pdf',
      gen: () =>
        genBankPdf({
          bank: 'HDFC Bank',
          accountLast10: '1234567890',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          opening: 50000.0,
          dateFormat: 'yyyy-MM-dd',
          rows: standardBankRows,
        }),
    },
    {
      name: 'bank-newest-first.pdf',
      gen: () =>
        genBankPdf({
          bank: 'HDFC Bank',
          accountLast10: '1234567890',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          opening: 50000.0,
          newestFirst: true,
          rows: standardBankRows,
        }),
    },
    {
      name: 'bank-ref-column.pdf',
      gen: () =>
        genBankPdf({
          bank: 'HDFC Bank',
          accountLast10: '1234567890',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          opening: 50000.0,
          layout: 'with-ref-column',
          rows: refColumnBankRows,
        }),
    },
    {
      name: 'bank-no-balance.pdf',
      gen: () =>
        genBankPdf({
          bank: 'HDFC Bank',
          accountLast10: '1234567890',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          opening: 50000.0,
          layout: 'withdrawal-deposit-no-balance',
          rows: standardBankRows,
        }),
    },
    {
      name: 'bank-encrypted.pdf',
      gen: () =>
        genBankPdf({
          bank: 'HDFC Bank',
          accountLast10: '1234567890',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          opening: 50000.0,
          password: 'testPassword123',
          rows: standardBankRows,
        }),
    },
    {
      name: 'card-standard.pdf',
      gen: () =>
        genCardPdf({
          issuer: 'HDFC Bank',
          cardLast4: '4321',
          statementDate: '2026-04-30',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          previousBalance: 15000.0,
          paymentsReceived: 15000.0,
          financeCharges: 250.0,
          creditLimit: 200000.0,
          rows: standardCardRows,
        }),
    },
    {
      name: 'card-encrypted.pdf',
      gen: () =>
        genCardPdf({
          issuer: 'HDFC Bank',
          cardLast4: '4321',
          statementDate: '2026-04-30',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          previousBalance: 15000.0,
          paymentsReceived: 15000.0,
          financeCharges: 250.0,
          creditLimit: 200000.0,
          password: 'cardSecretPassword',
          rows: standardCardRows,
        }),
    },
    {
      name: 'bank-standard-string.xlsx',
      gen: () =>
        genBankXlsx(
          {
            bank: 'HDFC Bank',
            accountLast10: '1234567890',
            periodStart: '2026-04-01',
            periodEnd: '2026-04-30',
            opening: 50000.0,
            rows: standardBankRows,
          },
          'string'
        ),
    },
    {
      name: 'bank-numeric.xlsx',
      gen: () =>
        genBankXlsx(
          {
            bank: 'HDFC Bank',
            accountLast10: '1234567890',
            periodStart: '2026-04-01',
            periodEnd: '2026-04-30',
            opening: 50000.0,
            rows: standardBankRows,
          },
          'numeric'
        ),
    },
    {
      name: 'bank-grouped-int.xlsx',
      gen: () =>
        genBankXlsx(
          {
            bank: 'HDFC Bank',
            accountLast10: '1234567890',
            periodStart: '2026-04-01',
            periodEnd: '2026-04-30',
            opening: 50000.0,
            rows: standardBankRows,
          },
          'grouped-integer'
        ),
    },
    {
      name: 'bank-newest-first.xlsx',
      gen: () =>
        genBankXlsx(
          {
            bank: 'HDFC Bank',
            accountLast10: '1234567890',
            periodStart: '2026-04-01',
            periodEnd: '2026-04-30',
            opening: 50000.0,
            newestFirst: true,
            rows: standardBankRows,
          },
          'string'
        ),
    },
    {
      name: 'bank-no-balance.xlsx',
      gen: () =>
        genBankXlsx(
          {
            bank: 'HDFC Bank',
            accountLast10: '1234567890',
            periodStart: '2026-04-01',
            periodEnd: '2026-04-30',
            opening: 50000.0,
            layout: 'withdrawal-deposit-no-balance',
            rows: standardBankRows,
          },
          'string'
        ),
    },
    {
      name: 'bank-ref-column.xlsx',
      gen: () =>
        genBankXlsx(
          {
            bank: 'HDFC Bank',
            accountLast10: '1234567890',
            periodStart: '2026-04-01',
            periodEnd: '2026-04-30',
            opening: 50000.0,
            layout: 'with-ref-column',
            rows: refColumnBankRows,
          },
          'string'
        ),
    },
  ];

  for (const sample of samples) {
    const filePath = path.join(SAMPLES_DIR, sample.name);
    const buf = await sample.gen();
    fs.writeFileSync(filePath, buf);
    console.log(`Created ${sample.name} (${buf.length} bytes)`);
  }
}

generateAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

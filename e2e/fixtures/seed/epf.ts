import PDFDocument from 'pdfkit';

import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';
import { createBankAccount } from './accounts';
import { createTransaction } from './transactions';

export type EpfEmployerResponse = components['schemas']['EpfEmployerResponse'];
export type EpfEntryRequest = components['schemas']['EpfEntryRequest'];
export type EpfEntryResponse = components['schemas']['EpfEntryResponse'];

let epfCounter = 0;

/** Creates an employer (a made-up name unless one is given). */
export async function createEpfEmployer(
  api: ApiClient,
  overrides: Partial<components['schemas']['EpfEmployerRequest']> = {},
): Promise<EpfEmployerResponse> {
  epfCounter += 1;
  const res = await api.POST('/api/v1/epf/employers', {
    body: { name: `Acme Labs ${epfCounter}`, joinedOn: '2020-06-01', ...overrides },
  });
  if (!res.data || res.response.status >= 300) {
    throw new Error(`createEpfEmployer failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

/** Creates an entry by hand. */
export async function createEpfEntry(api: ApiClient, body: EpfEntryRequest): Promise<EpfEntryResponse> {
  const res = await api.POST('/api/v1/epf/entries', { body });
  if (!res.data || res.response.status >= 300) {
    throw new Error(`createEpfEntry failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`);
  }
  return res.data;
}

export interface SeededEpf {
  employer: EpfEmployerResponse;
}

/** One employer with an opening balance of ₹5,00,000 (₹3,00,000 yours, ₹2,00,000 employer's) on 1 Apr 2026. */
export async function seedEpfBalance(api: ApiClient, employerName = 'Acme Labs Seed'): Promise<SeededEpf> {
  const employer = await createEpfEmployer(api, { name: employerName });
  await createEpfEntry(api, {
    type: 'OPENING_BALANCE',
    employerId: employer.id,
    creditedOn: '2026-04-01',
    employeeAmount: 300000,
    employerAmount: 200000,
  });
  return { employer };
}

/**
 * A partial withdrawal of ₹50,000 (₹30,000 + ₹20,000) credited `daysAgo` days ago, with a bank credit of `creditAmount`
 * the day after (so it is a suggested match when the amounts agree). Returns both ids.
 */
export async function seedEpfWithdrawal(
  api: ApiClient,
  employerId: string,
  opts: { creditedOn: string; creditDate: string; creditAmount: number; description?: string; tdsAmount?: number | null },
) {
  const bank = await createBankAccount(api, { name: 'EPF Bank' });
  const entry = await createEpfEntry(api, {
    type: 'WITHDRAWAL',
    withdrawalKind: 'PARTIAL',
    employerId,
    creditedOn: opts.creditedOn,
    employeeAmount: 30000,
    employerAmount: 20000,
    tdsAmount: opts.tdsAmount ?? null,
  });
  const credit = await createTransaction(api, bank.id, {
    amount: opts.creditAmount,
    date: opts.creditDate,
    description: opts.description ?? 'NEFT EPFO PF SETTLEMENT',
  });
  return { bank, entry, credit };
}

export interface PassbookOptions {
  /** One contribution row, or none. */
  withWithdrawal?: boolean;
  /** Member id of the made-up establishment. */
  memberId?: string;
  uan?: string;
}

/** The lines of a synthetic EPFO passbook (made-up company, member and amounts). */
export function passbookLines(opts: PassbookOptions = {}): string[] {
  const memberId = opts.memberId ?? 'MHBAN00123450000067890';
  const lines = [
    'Employees Provident Fund Organisation',
    'Establishment ID/Name  MHBAN0012345000 / NORTHWIND LABS PRIVATE LIMITED',
    `Member ID/Name  ${memberId} / TEST MEMBER`,
    `UAN  ${opts.uan ?? '100123454321'}`,
    'Wage Month Transaction Date Transaction Type Particulars EPF Wages EPS Wages Employee Share Employer Share Pension',
    'OB Int. Updated upto 31/03/2025 4,10,920 2,97,210 0',
    'Apr-2025 15-05-2025 CR Cont. For Due-Month 052025 60,000 15,000 7,200 5,950 1,250',
    'May-2025 15-06-2025 CR Cont. For Due-Month 062025 60,000 15,000 7,200 5,950 1,250',
    'Int. Updated upto 31/03/2026 32,410 23,770 0',
  ];
  if (opts.withWithdrawal) lines.push('15-09-2025 DR PF Withdrawal 10,000 8,000 0');
  lines.push('Closing Balance as on 31/03/2026 4,57,730 3,32,880 0');
  return lines;
}

/** Entries in the default passbook: opening balance, two contributions and one interest credit. */
export const PASSBOOK_ENTRIES = 4;
/** Employee + employer balance of the default passbook: 4,57,730 + 3,32,880. */
export const PASSBOOK_BALANCE = '₹7,90,610';

/** Writes the lines as a text PDF, one text operation per line, like the server's own test passbooks. */
export function passbookPdf(lines: string[] = passbookLines()): Promise<Buffer> {
  const doc = new PDFDocument({ size: [900, 800], margin: 20 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  doc.font('Helvetica').fontSize(9);
  let y = 40;
  for (const line of lines) {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    doc.text(line, 20, y, { lineBreak: false });
    y += 14;
  }
  doc.end();
  return done;
}

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

type PDFDocOptions = ConstructorParameters<typeof PDFDocument>[0];

export interface Row {
  date: string;
  description: string;
  debit?: number;
  credit?: number;
  ref?: string;
}

export interface BankSpec {
  bank: 'HDFC Bank' | string;
  accountLast10: string;
  periodStart: string;
  periodEnd: string;
  opening: number;
  rows: Row[];
  dateFormat?: 'dd/MM/yyyy' | 'dd-MMM-yyyy' | 'yyyy-MM-dd';
  newestFirst?: boolean;
  password?: string;
  layout?:
    | 'debit-credit-balance'
    | 'withdrawal-deposit-no-balance'
    | 'with-ref-column';
}

export interface CardSpec {
  issuer: string;
  cardLast4: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;
  previousBalance: number;
  paymentsReceived: number;
  financeCharges: number;
  creditLimit: number;
  rows: Row[];
  password?: string;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function parseIsoDate(d: string): { year: number; month: number; day: number } {
  // Supports YYYY-MM-DD, DD/MM/YYYY, DD-MMM-YYYY
  if (d.includes('-') && d.split('-')[0].length === 4) {
    const [y, m, day] = d.split('-').map(Number);
    return { year: y, month: m, day };
  }
  if (d.includes('/')) {
    const [day, m, y] = d.split('/').map(Number);
    return { year: y, month: m, day };
  }
  if (d.includes('-')) {
    const parts = d.split('-');
    const day = Number(parts[0]);
    const monthIdx = MONTHS.findIndex(
      (m) => m.toLowerCase() === parts[1].toLowerCase()
    );
    const y = Number(parts[2]);
    return { year: y, month: monthIdx + 1, day };
  }
  return { year: 2026, month: 4, day: 1 };
}

export function toIsoDate(d: string): string {
  const { year, month, day } = parseIsoDate(d);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function formatDate(
  d: string,
  fmt: 'dd/MM/yyyy' | 'dd-MMM-yyyy' | 'yyyy-MM-dd' = 'dd/MM/yyyy'
): string {
  const { year, month, day } = parseIsoDate(d);
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  if (fmt === 'yyyy-MM-dd') {
    return `${year}-${mm}-${dd}`;
  }
  if (fmt === 'dd-MMM-yyyy') {
    return `${dd}-${MONTHS[month - 1]}-${year}`;
  }
  return `${dd}/${mm}/${year}`;
}

export function formatAmount(val: number, decimals = 2): string {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function expected(
  spec: BankSpec | CardSpec
): {
  transactions: { date: string; amount: number; description: string }[];
  closing: number;
  totalDue?: number;
} {
  if ('opening' in spec) {
    // Bank spec
    let running = spec.opening;
    const txns: { date: string; amount: number; description: string }[] = [];

    // Rows are processed in chronological order
    for (const r of spec.rows) {
      const isDebit = r.debit !== undefined && r.debit > 0;
      const amount = isDebit ? -r.debit! : r.credit || 0;
      running += amount;
      txns.push({
        date: toIsoDate(r.date),
        amount,
        description: r.description.replace(/\n/g, ' ').trim(),
      });
    }

    return {
      transactions: txns,
      closing: Math.round(running * 100) / 100,
    };
  } else {
    // Card spec
    const totalPurchases = spec.rows
      .filter((r) => r.debit !== undefined && r.debit > 0)
      .reduce((sum, r) => sum + (r.debit || 0), 0);
    const totalCredits = spec.rows
      .filter((r) => r.credit !== undefined && r.credit > 0)
      .reduce((sum, r) => sum + (r.credit || 0), 0);

    const txns = spec.rows.map((r) => {
      const isDebit = r.debit !== undefined && r.debit > 0;
      const amount = isDebit ? -r.debit! : r.credit || 0;
      return {
        date: toIsoDate(r.date),
        amount,
        description: r.description.replace(/\n/g, ' ').trim(),
      };
    });

    const totalDue =
      spec.previousBalance +
      spec.financeCharges +
      totalPurchases -
      (spec.paymentsReceived || totalCredits);

    return {
      transactions: txns,
      closing: Math.round(totalDue * 100) / 100,
      totalDue: Math.round(totalDue * 100) / 100,
    };
  }
}

/**
 * Generates a synthetic Bank statement PDF in memory.
 */
export async function genBankPdf(spec: BankSpec): Promise<Buffer> {
  const dateFormat = spec.dateFormat || 'dd/MM/yyyy';
  const layout = spec.layout || 'debit-credit-balance';

  const docOptions: PDFDocOptions = {
    size: 'A4',
    margin: 50,
    info: {
      Title: `${spec.bank} Statement`,
      Author: spec.bank,
    },
  };

  if (spec.password) {
    docOptions.userPassword = spec.password;
    docOptions.ownerPassword = spec.password;
  }

  const doc = new PDFDocument(docOptions);
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

  const promise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Calculate row balances
  let running = spec.opening;
  const rowsWithBalance = spec.rows.map((r) => {
    const isDebit = r.debit !== undefined && r.debit > 0;
    const amount = isDebit ? -r.debit! : r.credit || 0;
    running += amount;
    return {
      ...r,
      signedAmount: amount,
      balance: running,
    };
  });

  const displayRows = spec.newestFirst
    ? [...rowsWithBalance].reverse()
    : rowsWithBalance;

  // Header furniture
  doc.font('Helvetica-Bold').fontSize(14).text(spec.bank, 50, 50);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Account No: ${spec.accountLast10}`, 50, 70);
  doc.text(
    `Statement Period: ${formatDate(spec.periodStart, dateFormat)} to ${formatDate(spec.periodEnd, dateFormat)}`,
    50,
    85
  );
  if (layout !== 'withdrawal-deposit-no-balance') {
    doc.text(`Opening Balance: ${formatAmount(spec.opening)}`, 50, 100);
  }

  // Table header
  let y = 130;
  doc.font('Helvetica-Bold').fontSize(9);

  if (layout === 'withdrawal-deposit-no-balance') {
    doc.text('Date', 50, y, { width: 70 });
    doc.text('Description', 125, y, { width: 175 });
    doc.text('Withdrawal Amt.', 310, y, { width: 100, align: 'right' });
    doc.text('Deposit Amt.', 420, y, { width: 100, align: 'right' });
  } else if (layout === 'with-ref-column') {
    doc.text('Date', 50, y, { width: 65 });
    doc.text('Description', 120, y, { width: 140 });
    doc.text('Chq/Ref No.', 265, y, { width: 70, align: 'center' });
    doc.text('Withdrawal Amt.', 340, y, { width: 80, align: 'right' });
    doc.text('Deposit Amt.', 425, y, { width: 75, align: 'right' });
    doc.text('Balance', 505, y, { width: 65, align: 'right' });
  } else {
    // Default 'debit-credit-balance'
    doc.text('Date', 50, y, { width: 70 });
    doc.text('Description', 125, y, { width: 175 });
    doc.text('Debit', 310, y, { width: 75, align: 'right' });
    doc.text('Credit', 390, y, { width: 75, align: 'right' });
    doc.text('Balance', 470, y, { width: 80, align: 'right' });
  }

  y += 18;
  doc.font('Helvetica').fontSize(9);

  // Table rows
  for (const r of displayRows) {
    const formattedDate = formatDate(r.date, dateFormat);
    const debitText =
      r.debit !== undefined && r.debit > 0 ? formatAmount(r.debit) : '';
    const creditText =
      r.credit !== undefined && r.credit > 0 ? formatAmount(r.credit) : '';
    const balanceText = formatAmount(r.balance);

    const descLines = r.description.split('\n');
    const rowHeight = Math.max(16, descLines.length * 12 + 4);

    doc.text(formattedDate, 50, y, { width: 70 });

    if (layout === 'withdrawal-deposit-no-balance') {
      doc.text(r.description, 125, y, { width: 175 });
      if (debitText) doc.text(debitText, 310, y, { width: 100, align: 'right' });
      if (creditText) doc.text(creditText, 420, y, { width: 100, align: 'right' });
    } else if (layout === 'with-ref-column') {
      doc.text(r.description, 120, y, { width: 140 });
      if (r.ref) doc.text(r.ref, 265, y, { width: 70, align: 'center' });
      if (debitText) doc.text(debitText, 340, y, { width: 80, align: 'right' });
      if (creditText) doc.text(creditText, 425, y, { width: 75, align: 'right' });
      doc.text(balanceText, 505, y, { width: 65, align: 'right' });
    } else {
      doc.text(r.description, 125, y, { width: 175 });
      if (debitText) doc.text(debitText, 310, y, { width: 75, align: 'right' });
      if (creditText) doc.text(creditText, 390, y, { width: 75, align: 'right' });
      doc.text(balanceText, 470, y, { width: 80, align: 'right' });
    }

    y += rowHeight;
  }

  // Closing balance line
  if (layout !== 'withdrawal-deposit-no-balance') {
    y += 10;
    doc.text(`Closing Balance: ${formatAmount(running)}`, 50, y);
  }

  // Page furniture
  doc.fontSize(8).text(`${spec.bank} - Page 1`, 50, 780, { align: 'center', width: 500 });

  doc.end();
  return promise;
}

/**
 * Generates a synthetic Credit Card statement PDF in memory.
 */
export async function genCardPdf(spec: CardSpec): Promise<Buffer> {
  const docOptions: PDFDocOptions = {
    size: 'A4',
    margin: 50,
    info: {
      Title: `${spec.issuer} Credit Card Statement`,
      Author: spec.issuer,
    },
  };

  if (spec.password) {
    docOptions.userPassword = spec.password;
    docOptions.ownerPassword = spec.password;
  }

  const doc = new PDFDocument(docOptions);
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

  const promise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const totalPurchases = spec.rows
    .filter((r) => r.debit !== undefined && r.debit > 0)
    .reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCredits = spec.rows
    .filter((r) => r.credit !== undefined && r.credit > 0)
    .reduce((sum, r) => sum + (r.credit || 0), 0);

  const totalAmountDue =
    spec.previousBalance +
    spec.financeCharges +
    totalPurchases -
    (spec.paymentsReceived || totalCredits);
  const minAmountDue = Math.max(500, Math.round(totalAmountDue * 0.05 * 100) / 100);

  // Due date ~15 days after periodEnd
  const { year, month, day } = parseIsoDate(spec.periodEnd);
  const dueDay = Math.min(28, day + 15);
  const dueDateStr = `${String(dueDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  // Header & Branding
  doc.font('Helvetica-Bold').fontSize(14).text(`${spec.issuer} Credit Card Statement`, 50, 50);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Card No: XXXX-XXXX-XXXX-${spec.cardLast4}`, 50, 70);
  doc.text(`Statement Date: ${formatDate(spec.statementDate)}`, 50, 85);
  doc.text(
    `Statement Period: ${formatDate(spec.periodStart)} to ${formatDate(spec.periodEnd)}`,
    50,
    100
  );

  // Summary box
  let sy = 125;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text(`Credit Limit: ${formatAmount(spec.creditLimit)}`, 50, sy);
  doc.text(`Total Amount Due: ${formatAmount(totalAmountDue)}`, 300, sy);
  sy += 15;
  doc.text(`Previous Balance: ${formatAmount(spec.previousBalance)}`, 50, sy);
  doc.text(`Minimum Amount Due: ${formatAmount(minAmountDue)}`, 300, sy);
  sy += 15;
  doc.text(`Payments Received: ${formatAmount(spec.paymentsReceived || totalCredits)}`, 50, sy);
  doc.text(`Payment Due Date: ${dueDateStr}`, 300, sy);
  sy += 15;
  doc.text(`Total Purchases: ${formatAmount(totalPurchases)}`, 50, sy);
  doc.text(`Finance Charges: ${formatAmount(spec.financeCharges)}`, 300, sy);

  // Table header
  let y = sy + 30;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Date', 50, y, { width: 70 });
  doc.text('Description', 130, y, { width: 280 });
  doc.text('Amount', 420, y, { width: 100, align: 'right' });

  y += 18;
  doc.font('Helvetica').fontSize(9);

  // Rows
  for (const r of spec.rows) {
    const formattedDate = formatDate(r.date);
    const isCredit = r.credit !== undefined && r.credit > 0;
    const amountVal = isCredit ? r.credit! : r.debit || 0;
    const amountText = isCredit
      ? `${formatAmount(amountVal)} Cr`
      : formatAmount(amountVal);

    doc.text(formattedDate, 50, y, { width: 70 });
    doc.text(r.description, 130, y, { width: 280 });
    doc.text(amountText, 420, y, { width: 100, align: 'right' });
    y += 16;
  }

  doc.fontSize(8).text(`${spec.issuer} - Page 1`, 50, 780, { align: 'center', width: 500 });

  doc.end();
  return promise;
}

/**
 * Generates a synthetic Bank statement XLSX in memory using exceljs.
 */
export async function genBankXlsx(
  spec: BankSpec,
  variant: 'string' | 'numeric' | 'grouped-integer' = 'string'
): Promise<Buffer> {
  const dateFormat = spec.dateFormat || 'dd/MM/yyyy';
  const layout = spec.layout || 'debit-credit-balance';

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Statement');

  // Metadata rows
  sheet.getCell('A1').value = spec.bank;
  sheet.getCell('A2').value = `Account No: ${spec.accountLast10}`;
  sheet.getCell('A3').value = `Statement Period: ${formatDate(spec.periodStart, dateFormat)} to ${formatDate(spec.periodEnd, dateFormat)}`;
  if (layout !== 'withdrawal-deposit-no-balance') {
    sheet.getCell('A4').value = `Opening Balance: ${formatAmount(spec.opening)}`;
  }

  // Calculate balances
  let running = spec.opening;
  const rowsWithBalance = spec.rows.map((r) => {
    const isDebit = r.debit !== undefined && r.debit > 0;
    const amount = isDebit ? -r.debit! : r.credit || 0;
    running += amount;
    return {
      ...r,
      balance: running,
    };
  });

  const displayRows = spec.newestFirst
    ? [...rowsWithBalance].reverse()
    : rowsWithBalance;

  let rowIdx = 5;
  if (layout === 'withdrawal-deposit-no-balance') {
    sheet.getRow(rowIdx).values = [
      'Date',
      'Description',
      'Withdrawal Amt.',
      'Deposit Amt.',
    ];
  } else if (layout === 'with-ref-column') {
    sheet.getRow(rowIdx).values = [
      'Date',
      'Description',
      'Chq/Ref No.',
      'Withdrawal Amt.',
      'Deposit Amt.',
      'Balance',
    ];
  } else {
    sheet.getRow(rowIdx).values = [
      'Date',
      'Description',
      'Debit',
      'Credit',
      'Balance',
    ];
  }

  rowIdx++;

  for (const r of displayRows) {
    const row = sheet.getRow(rowIdx);
    const dateStr = formatDate(r.date, dateFormat);
    const debitVal = r.debit !== undefined && r.debit > 0 ? r.debit : undefined;
    const creditVal = r.credit !== undefined && r.credit > 0 ? r.credit : undefined;

    const fmtVal = (val: number | undefined) => {
      if (val === undefined) return null;
      if (variant === 'numeric') return val;
      if (variant === 'grouped-integer') {
        return Math.round(val).toLocaleString('en-US');
      }
      return formatAmount(val);
    };

    if (layout === 'withdrawal-deposit-no-balance') {
      row.getCell(1).value = dateStr;
      row.getCell(2).value = r.description;
      if (debitVal !== undefined) row.getCell(3).value = fmtVal(debitVal);
      if (creditVal !== undefined) row.getCell(4).value = fmtVal(creditVal);
    } else if (layout === 'with-ref-column') {
      row.getCell(1).value = dateStr;
      row.getCell(2).value = r.description;
      if (r.ref) {
        row.getCell(3).value = variant === 'numeric' ? Number(r.ref) : r.ref;
      }
      if (debitVal !== undefined) row.getCell(4).value = fmtVal(debitVal);
      if (creditVal !== undefined) row.getCell(5).value = fmtVal(creditVal);
      row.getCell(6).value = fmtVal(r.balance);
    } else {
      row.getCell(1).value = dateStr;
      row.getCell(2).value = r.description;
      if (debitVal !== undefined) row.getCell(3).value = fmtVal(debitVal);
      if (creditVal !== undefined) row.getCell(4).value = fmtVal(creditVal);
      row.getCell(5).value = fmtVal(r.balance);
    }
    rowIdx++;
  }

  if (layout !== 'withdrawal-deposit-no-balance') {
    sheet.getCell(`A${rowIdx}`).value = `Closing Balance: ${formatAmount(running)}`;
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

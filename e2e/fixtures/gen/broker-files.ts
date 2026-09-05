import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

type PDFDocOptions = ConstructorParameters<typeof PDFDocument>[0];

export interface ZerodhaRow {
  symbol: string;
  isin?: string;
  tradeDate: string; // YYYY-MM-DD
  exchange?: string;
  segment?: string;
  series?: string;
  tradeType: 'buy' | 'sell' | string;
  auction?: boolean;
  quantity: number;
  price: number;
  tradeId?: string;
  orderId?: string;
  orderExecutionTime?: string;
}

export interface GrowwRow {
  symbol: string;
  name?: string;
  isin?: string;
  type: 'buy' | 'sell' | 'B' | 'S' | 'Purchase' | 'Redemption' | string;
  quantity: number;
  price?: number;
  value?: number;
  tradeDate: string;
  orderId?: string;
  exchange?: string;
  category?: string;
  orderStatus?: string; // e.g. 'Executed', 'Cancelled'
}

export interface CasTxn {
  date: string; // e.g. '01-Aug-2026' or '01/08/2026' or '2026-08-01'
  description: string; // e.g. 'Purchase', 'SIP Purchase', 'Redemption', 'IDCW Payout'
  amount: number;
  units: number;
  nav: number;
  balance?: number;
}

export interface CasStampDuty {
  date: string;
  amount: number;
}

export interface CasFolio {
  folio: string;
  schemeName: string;
  isin: string;
  txns: CasTxn[];
  stampDuty?: CasStampDuty[];
  extraLines?: string[];
}

export interface CasSpec {
  investor?: string;
  amc: string; // e.g. 'HDFC' -> 'HDFC Mutual Fund'
  folios: CasFolio[];
  password?: string;
  nonTextLayer?: boolean;
}

export function genZerodhaTradebookCsv(
  rows: ZerodhaRow[],
  opts: {
    bom?: boolean;
    shuffleColumns?: boolean;
    extraColumns?: Record<string, string>;
  } = {}
): Buffer {
  const baseHeaders = [
    'symbol',
    'isin',
    'trade_date',
    'exchange',
    'segment',
    'series',
    'trade_type',
    'auction',
    'quantity',
    'price',
    'trade_id',
    'order_id',
    'order_execution_time',
  ];

  const extraKeys = opts.extraColumns ? Object.keys(opts.extraColumns) : [];
  let headers = [...baseHeaders, ...extraKeys];

  if (opts.shuffleColumns) {
    // Deterministic shuffle
    headers = [
      'trade_date',
      'trade_type',
      'symbol',
      'quantity',
      'price',
      'isin',
      'exchange',
      'segment',
      'trade_id',
      'order_id',
      'series',
      'auction',
      'order_execution_time',
      ...extraKeys,
    ];
  }

  const lines: string[] = [];
  lines.push(headers.join(','));

  for (const r of rows) {
    const map: Record<string, string> = {
      symbol: r.symbol,
      isin: r.isin ?? '',
      trade_date: r.tradeDate,
      exchange: r.exchange ?? 'NSE',
      segment: r.segment ?? 'EQ',
      series: r.series ?? 'EQ',
      trade_type: r.tradeType,
      auction: r.auction ? 'true' : 'false',
      quantity: String(r.quantity),
      price: String(r.price),
      trade_id: r.tradeId ?? '',
      order_id: r.orderId ?? '',
      order_execution_time: r.orderExecutionTime ?? `${r.tradeDate}T10:00:00`,
      ...(opts.extraColumns ?? {}),
    };

    const rowStr = headers.map((h) => map[h] ?? '').join(',');
    lines.push(rowStr);
  }

  const csvContent = lines.join('\n');
  if (opts.bom) {
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csvContent, 'utf-8')]);
  }
  return Buffer.from(csvContent, 'utf-8');
}

export async function genGrowwStocksXlsx(
  rows: GrowwRow[],
  opts: {
    preambleRows?: number;
    priceColumn?: boolean; // false -> emit Value instead of Price
    statusColumn?: boolean; // default true
    dateFormat?: string;
  } = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Order History');

  let currentRow = 1;
  const preambleCount = opts.preambleRows ?? 0;
  for (let i = 0; i < preambleCount; i++) {
    sheet.getRow(currentRow).values = [`Groww Stock Report Preamble line ${i + 1}`, 'Metadata', 'Export'];
    currentRow++;
  }

  const usePrice = opts.priceColumn !== false;
  const hasStatus = opts.statusColumn !== false;

  const headers = [
    'Stock Name',
    'ISIN',
    'Type',
    'Quantity',
    usePrice ? 'Price' : 'Value',
    'Execution Date and Time',
    'Exchange',
    'Order ID',
  ];
  if (hasStatus) {
    headers.push('Order Status');
  }

  sheet.getRow(currentRow).values = headers;
  currentRow++;

  for (const r of rows) {
    const valOrPrice = usePrice
      ? r.price ?? (r.value !== undefined && r.quantity > 0 ? r.value / r.quantity : 0)
      : r.value ?? (r.price !== undefined ? r.price * r.quantity : 0);

    const dateStr = r.tradeDate;

    const rowValues = [
      r.name ?? r.symbol,
      r.isin ?? '',
      r.type,
      r.quantity,
      valOrPrice,
      dateStr,
      r.exchange ?? 'NSE',
      r.orderId ?? '',
    ];
    if (hasStatus) {
      rowValues.push(r.orderStatus ?? 'Executed');
    }

    sheet.getRow(currentRow).values = rowValues;
    currentRow++;
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function genGrowwStocksCsv(
  rows: GrowwRow[],
  opts: {
    preambleRows?: number;
    priceColumn?: boolean;
    statusColumn?: boolean;
  } = {}
): Buffer {
  const lines: string[] = [];
  const preambleCount = opts.preambleRows ?? 0;
  for (let i = 0; i < preambleCount; i++) {
    lines.push(`Groww Stock Report Preamble line ${i + 1},Metadata,Export`);
  }

  const usePrice = opts.priceColumn !== false;
  const hasStatus = opts.statusColumn !== false;

  const headers = [
    'Stock Name',
    'ISIN',
    'Type',
    'Quantity',
    usePrice ? 'Price' : 'Value',
    'Execution Date and Time',
    'Exchange',
    'Order ID',
  ];
  if (hasStatus) {
    headers.push('Order Status');
  }

  lines.push(headers.join(','));

  for (const r of rows) {
    const valOrPrice = usePrice
      ? r.price ?? (r.value !== undefined && r.quantity > 0 ? r.value / r.quantity : 0)
      : r.value ?? (r.price !== undefined ? r.price * r.quantity : 0);

    const rowVals = [
      `"${(r.name ?? r.symbol).replace(/"/g, '""')}"`,
      r.isin ?? '',
      r.type,
      r.quantity,
      valOrPrice,
      r.tradeDate,
      r.exchange ?? 'NSE',
      r.orderId ?? '',
    ];
    if (hasStatus) {
      rowVals.push(r.orderStatus ?? 'Executed');
    }
    lines.push(rowVals.join(','));
  }

  return Buffer.from(lines.join('\n'), 'utf-8');
}

export async function genCasPdf(spec: CasSpec): Promise<Buffer> {
  const docOptions: PDFDocOptions = {
    size: 'A4',
    margin: 40,
    info: {
      Title: 'Consolidated Account Statement',
      Author: 'CAMS / KFintech',
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

  if (spec.nonTextLayer) {
    // Create an image or drawn shape without text layer
    doc.rect(50, 50, 400, 400).fill('#eeeeee');
    doc.end();
    return promise;
  }

  doc.font('Helvetica-Bold').fontSize(14).text('Consolidated Account Statement', 40, 40);
  doc.font('Helvetica').fontSize(10);
  if (spec.investor) {
    doc.text(`Investor: ${spec.investor}`, 40, 60);
  }
  doc.text('Statement Period: 01-Jan-2026 to 31-Aug-2026', 40, 75);

  let y = 100;

  // AMC Header: Standalone "<Name> Mutual Fund" line with no digits
  const amcHeader = spec.amc.toLowerCase().endsWith('mutual fund')
    ? spec.amc
    : `${spec.amc} Mutual Fund`;
  doc.font('Helvetica-Bold').fontSize(12).text(amcHeader, 40, y);
  y += 20;

  for (const folio of spec.folios) {
    doc.font('Helvetica').fontSize(10);
    doc.text(`Folio No : ${folio.folio}`, 40, y);
    y += 15;

    // Scheme name with ISIN
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`${folio.schemeName} - ISIN: ${folio.isin}`, 40, y);
    y += 15;

    // Table Header
    doc.font('Helvetica').fontSize(9);
    doc.text('Date          Description                    Amount       Units     NAV    Balance', 40, y);
    y += 15;

    for (const txn of folio.txns) {
      const balanceStr = txn.balance !== undefined ? `  ${txn.balance.toFixed(3)}` : '';
      const line = `${txn.date}  ${txn.description.padEnd(28)}  ${txn.amount.toFixed(2)}  ${txn.units.toFixed(3)}  ${txn.nav.toFixed(4)}${balanceStr}`;
      doc.text(line, 40, y);
      y += 14;

      if (folio.stampDuty) {
        const matchingSds = folio.stampDuty.filter((sd) => sd.date === txn.date);
        for (const sd of matchingSds) {
          const sdLine = `${sd.date}  *** Stamp Duty ***  ${sd.amount.toFixed(2)}`;
          doc.text(sdLine, 40, y);
          y += 14;
        }
      }
    }

    if (folio.extraLines) {
      for (const el of folio.extraLines) {
        doc.text(el, 40, y);
        y += 14;
      }
    }

    y += 10;
  }

  doc.end();
  return promise;
}

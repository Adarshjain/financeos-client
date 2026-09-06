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

export interface ZerodhaTaxPnlRow {
  symbol: string;
  isin?: string;
  entryDate?: string; // YYYY-MM-DD
  exitDate?: string; // YYYY-MM-DD
  date?: string; // fallback for entry & exit
  quantity: number;
  buyValue?: number;
  sellValue?: number;
  profit?: number;
  brokerage?: number;
  exchangeTxnCharges?: number;
  ipft?: number;
  sebiCharges?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  stampDuty?: number;
  stt?: number;
}

export interface ZerodhaFnoExitRow {
  tradingSymbol: string;
  quantity: number;
  buyValue?: number;
  sellValue?: number;
  profit?: number;
  entryDate?: string;
  exitDate?: string;
  brokerage?: number;
  exchangeTxnCharges?: number;
  ipft?: number;
  sebiCharges?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  stampDuty?: number;
  stt?: number;
  dpCharges?: number;
  otherCharges?: number;
}

export interface ZerodhaTaxPnlSpec {
  sheetName?: string;
  intraday?: ZerodhaTaxPnlRow[];
  shortTerm?: ZerodhaTaxPnlRow[];
  longTerm?: ZerodhaTaxPnlRow[];
  buyback?: ZerodhaTaxPnlRow[];
  fno?: ZerodhaFnoExitRow[];
}

export async function genZerodhaTaxPnlXlsx(spec: ZerodhaTaxPnlSpec): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(spec.sheetName || 'Tradewise Exits from 2026-04-01');

  let currentRow = 1;

  const writeSection = (
    title: string,
    rows: ZerodhaTaxPnlRow[],
    isFno = false
  ) => {
    if (rows.length === 0) return;

    // Section title
    sheet.getRow(currentRow).values = [title];
    currentRow++;

    // Header row
    const headers = [
      'Symbol',
      ...(isFno ? [] : ['ISIN']),
      'Entry Date',
      'Exit Date',
      'Quantity',
      'Buy Value',
      'Sell Value',
      'Profit',
      'Brokerage',
      'Exchange Transaction Charges',
      'IPFT',
      'SEBI Charges',
      'CGST',
      'SGST',
      'IGST',
      'Stamp Duty',
      'STT',
    ];
    sheet.getRow(currentRow).values = headers;
    currentRow++;

    for (const r of rows) {
      const entryD = r.entryDate ?? r.date ?? '2026-08-01';
      const exitD = r.exitDate ?? r.date ?? '2026-08-01';
      const buyVal = r.buyValue ?? 0;
      const sellVal = r.sellValue ?? 0;
      const profitVal = r.profit ?? sellVal - buyVal;

      const rowValues = [
        r.symbol,
        ...(isFno ? [] : [r.isin ?? '']),
        entryD,
        exitD,
        r.quantity,
        buyVal,
        sellVal,
        profitVal,
        r.brokerage ?? 0,
        r.exchangeTxnCharges ?? 0,
        r.ipft ?? 0,
        r.sebiCharges ?? 0,
        r.cgst ?? 0,
        r.sgst ?? 0,
        r.igst ?? 0,
        r.stampDuty ?? 0,
        r.stt ?? 0,
      ];
      sheet.getRow(currentRow).values = rowValues;
      currentRow++;
    }

    currentRow++; // Empty spacing row
  };

  if (spec.intraday && spec.intraday.length > 0) {
    writeSection('Equity - Intraday', spec.intraday);
  }
  if (spec.shortTerm && spec.shortTerm.length > 0) {
    writeSection('Equity - Short Term', spec.shortTerm);
  }
  if (spec.longTerm && spec.longTerm.length > 0) {
    writeSection('Equity - Long Term', spec.longTerm);
  }
  if (spec.buyback && spec.buyback.length > 0) {
    writeSection('Equity - Buyback', spec.buyback);
  }
  if (spec.fno && spec.fno.length > 0) {
    const fnoMapped: ZerodhaTaxPnlRow[] = spec.fno.map((f) => ({
      symbol: f.tradingSymbol,
      quantity: f.quantity,
      buyValue: f.buyValue,
      sellValue: f.sellValue,
      profit: f.profit,
      entryDate: f.entryDate,
      exitDate: f.exitDate,
      brokerage: f.brokerage,
      exchangeTxnCharges: f.exchangeTxnCharges,
      ipft: f.ipft,
      sebiCharges: f.sebiCharges,
      cgst: f.cgst,
      sgst: f.sgst,
      igst: f.igst,
      stampDuty: f.stampDuty,
      stt: f.stt,
    }));
    writeSection('Equity - F&O', fnoMapped, true);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export interface GrowwOrderHistoryRow {
  stockName?: string;
  symbol?: string;
  isin?: string;
  type: 'buy' | 'sell' | 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  value?: number;
  exchange?: string;
  orderId?: string;
  executionDate: string; // YYYY-MM-DD or DD-MM-YYYY HH:mm a
  orderStatus?: string; // default 'Executed'
}

export async function genGrowwOrderHistoryXlsx(rows: GrowwOrderHistoryRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');

  // Headers
  const headers = [
    'Stock name',
    'Symbol',
    'ISIN',
    'Type',
    'Quantity',
    'Value',
    'Exchange',
    'Exchange Order Id',
    'Execution date and time',
    'Order status',
  ];
  sheet.getRow(1).values = headers;

  let currentRow = 2;
  for (const r of rows) {
    const totalVal = r.value !== undefined ? r.value : (r.price ?? 0) * r.quantity;
    sheet.getRow(currentRow).values = [
      r.stockName ?? r.symbol ?? '',
      r.symbol ?? '',
      r.isin ?? '',
      r.type.toUpperCase(),
      r.quantity,
      totalVal,
      r.exchange ?? 'NSE',
      r.orderId ?? `ord-${currentRow}`,
      r.executionDate,
      r.orderStatus ?? 'Executed',
    ];
    currentRow++;
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export interface GrowwCapitalGainsRow {
  stockName?: string;
  isin: string;
  quantity: number;
  buyDate?: string;
  buyPrice?: number;
  buyValue?: number;
  sellDate?: string;
  sellPrice?: number;
  sellValue?: number;
  realisedPnl?: number;
}

export interface GrowwCapitalGainsSpec {
  intraday?: GrowwCapitalGainsRow[];
  shortTerm?: GrowwCapitalGainsRow[];
  longTerm?: GrowwCapitalGainsRow[];
  buyback?: GrowwCapitalGainsRow[];
}

export async function genGrowwCapitalGainsXlsx(spec: GrowwCapitalGainsSpec): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');

  let currentRow = 1;

  const writeSubSection = (title: string, rows: GrowwCapitalGainsRow[]) => {
    if (rows.length === 0) return;

    sheet.getRow(currentRow).values = [title];
    currentRow++;

    const headers = [
      'Stock name',
      'ISIN',
      'Quantity',
      'Buy date',
      'Buy price',
      'Buy value',
      'Sell date',
      'Sell price',
      'Sell value',
      'Realised P&L',
      'Remark',
    ];
    sheet.getRow(currentRow).values = headers;
    currentRow++;

    for (const r of rows) {
      const buyVal = r.buyValue ?? (r.buyPrice ?? 0) * r.quantity;
      const sellVal = r.sellValue ?? (r.sellPrice ?? 0) * r.quantity;
      const pnl = r.realisedPnl ?? sellVal - buyVal;

      sheet.getRow(currentRow).values = [
        r.stockName ?? '',
        r.isin,
        r.quantity,
        r.buyDate ?? '2026-08-01',
        r.buyPrice ?? 0,
        buyVal,
        r.sellDate ?? '2026-08-01',
        r.sellPrice ?? 0,
        sellVal,
        pnl,
        '',
      ];
      currentRow++;
    }

    currentRow++; // Empty spacing row
  };

  if (spec.intraday && spec.intraday.length > 0) {
    writeSubSection('Intraday trades', spec.intraday);
  }
  if (spec.shortTerm && spec.shortTerm.length > 0) {
    writeSubSection('Short Term trades', spec.shortTerm);
  }
  if (spec.longTerm && spec.longTerm.length > 0) {
    writeSubSection('Long Term trades', spec.longTerm);
  }
  if (spec.buyback && spec.buyback.length > 0) {
    writeSubSection('Buyback trades', spec.buyback);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export interface HoldingsSnapshotRow {
  isin?: string;
  symbol?: string;
  quantity: number;
  averagePrice?: number;
}

export function genHoldingsSnapshotCsv(rows: HoldingsSnapshotRow[]): Buffer {
  const lines: string[] = ['isin,symbol,quantity,average_price'];
  for (const r of rows) {
    lines.push(`${r.isin ?? ''},${r.symbol ?? ''},${r.quantity},${r.averagePrice ?? 0}`);
  }
  return Buffer.from(lines.join('\n'), 'utf-8');
}

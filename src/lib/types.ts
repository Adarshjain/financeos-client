import type { Page } from '@/lib/pagination';

// Types generated from API spec

export enum AccountType {
  BANK_ACCOUNT = 'bank_account',
  CREDIT_CARD = 'credit_card',
  BROKER = 'broker',
  GENERIC = 'generic',
}
export type FinancialPosition = 'asset' | 'liability';
export type InvestmentTransactionType = 'buy' | 'sell';
export type SettlementType = 'delivery' | 'intraday';
export type OptionType = 'CE' | 'PE';
export type InstrumentType = 'stock' | 'mutual_fund' | 'etf' | 'future' | 'option';

// User & Auth
export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleAuthStartResponse {
  authorizationUrl: string;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName?: string;
  pictureUrl?: string;
  createdAt: string;
}


// Investments & Instruments
export type PriceSource = 'AMFI' | 'YAHOO' | 'MANUAL';

export interface Instrument {
  id: string;
  type: InstrumentType;
  name: string;
  symbol?: string;
  exchange?: string;
  isin?: string;
  amfiCode?: string;
  yahooSymbol?: string;
  currency: string;
  lastPrice?: string;
  lastPriceAsOf?: string;
  lastPriceSource?: PriceSource;
  underlyingSymbol?: string;
  underlyingInstrumentId?: string;
  expiryDate?: string;
  optionType?: OptionType;
  strikePrice?: string;
  lotSize?: number;
  tradingSymbol?: string;
}

export interface PriceHistoryPoint {
  id?: string;
  asOf: string;
  close: string;
  source: string;
}

export interface PriceRefreshFailure {
  instrumentId: string;
  instrumentName?: string;
  reason: string;
}

export interface PriceRefreshResult {
  refreshed: number;
  skipped: number;
  failed: PriceRefreshFailure[];
  asOf: string;
}

export interface CreateInstrumentRequest {
  type: InstrumentType;
  name: string;
  symbol?: string;
  exchange?: string;
  isin?: string;
  amfiCode?: string;
  yahooSymbol?: string;
  currency?: string;
  underlyingSymbol?: string;
  underlyingInstrumentId?: string;
  expiryDate?: string;
  optionType?: OptionType;
  strikePrice?: string;
  lotSize?: number;
  tradingSymbol?: string;
}

export interface InstrumentPricePreview {
  value: string;
  asOf: string;
}

export interface InstrumentCandidate {
  source: 'LOCAL' | 'AMFI' | 'YAHOO';
  type: InstrumentType;
  name: string;
  symbol?: string;
  exchange?: string;
  isin?: string;
  amfiCode?: string;
  yahooSymbol?: string;
  currency?: string;
  pricePreview?: InstrumentPricePreview;
  existingInstrumentId?: string;
}

export interface ResolveInstrumentRequest {
  type: InstrumentType;
  name: string;
  symbol?: string;
  exchange?: string;
  isin?: string;
  amfiCode?: string;
  yahooSymbol?: string;
  currency?: string;
  // Set for LOCAL candidates so the server reuses that exact instrument instead of
  // creating a duplicate when it lacks dedup keys (isin/amfiCode/yahooSymbol/symbol+exchange).
  existingInstrumentId?: string;
}

export interface SetPriceRequest {
  price: string | number;
  asOf?: string;
}

export interface Charges {
  brokerage?: number | string;
  stt?: number | string;
  exchangeTxnCharges?: number | string;
  sebiCharges?: number | string;
  stampDuty?: number | string;
  gst?: number | string;
  dpCharges?: number | string;
  otherCharges?: number | string;
}

export interface CreateInvestmentTransactionRequest {
  brokerAccountId: string;
  instrumentId: string;
  type: InvestmentTransactionType;
  settlementType?: SettlementType;
  quantity: string | number;
  price: string | number;
  tradeDate: string;
  charges?: Charges;
  notes?: string;
}

// A trade's broker+instrument are its identity and are NOT editable (the
// server ignores brokerAccountId/instrumentId on update). To change them,
// delete + recreate.
export interface UpdateInvestmentTransactionRequest {
  type: InvestmentTransactionType;
  settlementType?: SettlementType;
  quantity: string | number;
  price: string | number;
  tradeDate: string;
  charges?: Charges;
  notes?: string;
}

export interface InvestmentTransactionResponse {
  id: string;
  brokerAccountId: string;
  brokerName: string;
  provider: string;
  instrumentId: string;
  instrument: {
    id: string;
    type: InstrumentType;
    name: string;
    symbol?: string;
  };
  type: InvestmentTransactionType;
  settlementType?: SettlementType;
  quantity: string;
  price: string;
  tradeDate: string;
  brokerage?: string;
  stt?: string;
  exchangeTxnCharges?: string;
  sebiCharges?: string;
  stampDuty?: string;
  gst?: string;
  dpCharges?: string;
  otherCharges?: string;
  totalCharges?: string;
  source?: string;
  externalRef?: string;
  notes?: string;
  createdAt?: string;
}

export type PagedInvestmentTransactionResponse =
  Page<InvestmentTransactionResponse>;

export interface Position {
  holdingId: string;
  brokerAccountId: string;
  brokerName: string;
  provider: string;
  instrument: {
    id: string;
    type: InstrumentType;
    name: string;
    symbol?: string;
    isin?: string;
    amfiCode?: string;
    yahooSymbol?: string;
    lastPriceSource?: PriceSource;
    underlyingSymbol?: string;
    underlyingInstrumentId?: string;
    expiryDate?: string;
    optionType?: OptionType;
    strikePrice?: string;
    lotSize?: number;
    tradingSymbol?: string;
  };
  quantity: string;
  avgCost: string;
  invested: string;
  lastPrice?: string;
  lastPriceAsOf?: string;
  lastPriceSource?: PriceSource;
  currentValue?: string;
  unrealizedGainLoss?: string;
  unrealizedGainLossPercent?: string;
  realizedGainLoss: string;
  totalCharges: string;
  dividends?: string;
  xirr?: string;
  absoluteReturnPercent?: string;
  mergedIntoName?: string;
  mergedIntoDate?: string;
  buyQty?: string;
  buyValue?: string;
  avgBuy?: string;
  sellQty?: string;
  sellValue?: string;
  avgSell?: string;
  netQty?: string;
  unclosed?: boolean;
}

export interface InvestmentPositionResponse {
  positions: Position[];
}

export interface BrokerSummary {
  brokerAccountId: string;
  brokerName: string;
  provider: string;
  invested: string;
  currentValue: string;
  unrealized: string;
  realized: string;
  cashBalance?: string;
  totalCharges?: string;
}

export interface InstrumentTypeSummary {
  type: InstrumentType;
  invested?: string;
  currentValue: string;
  percentage: string;
}

export interface InvestmentSummary {
  totalInvested: string;
  totalCurrentValue: string;
  totalUnrealized: string;
  totalUnrealizedPercent: string;
  totalRealized: string;
  totalDividends: string;
  totalCharges: string;
  totalPnl: string;
  totalFnoRealized?: string;
  xirr?: string;
  absoluteReturnPercent?: string;
  byBroker: BrokerSummary[];
  byInstrumentType: InstrumentTypeSummary[];
}

// Dividends
export type DividendType = 'dividend' | 'interest' | 'other';

export interface Dividend {
  id: string;
  holdingId?: string;
  brokerAccountId: string;
  instrumentId: string;
  brokerName?: string;
  instrumentName?: string;
  symbol?: string;
  type: DividendType;
  amount: string;
  perUnit?: string;
  tds?: string;
  exDate?: string;
  payDate: string;
  source?: string;
  notes?: string;
  createdAt?: string;
}

export type PagedDividendResponse = Page<Dividend>;

export interface CreateDividendRequest {
  holdingId?: string;
  brokerAccountId: string;
  instrumentId: string;
  type: DividendType;
  amount: string | number;
  perUnit?: string | number;
  tds?: string | number;
  exDate?: string;
  payDate: string;
  notes?: string;
}

// A dividend's broker+instrument (and holding) are its identity and are NOT
// editable (the server ignores holdingId/brokerAccountId/instrumentId on
// update). To change them, delete + recreate.
export interface UpdateDividendRequest {
  type: DividendType;
  amount: string | number;
  payDate: string;
  perUnit?: string | number;
  tds?: string | number;
  exDate?: string;
  notes?: string;
}

// Corporate Actions
export type CorporateActionType = 'split' | 'bonus' | 'demerger' | 'merger';

export interface CorporateAction {
  id: string;
  instrumentId: string;
  instrumentName?: string;
  instrumentSymbol?: string;
  type: CorporateActionType;
  ratioFrom: number;
  ratioTo: number;
  exDate: string;
  notes?: string;
  targetInstrumentId?: string;
  targetInstrumentName?: string;
  targetInstrumentSymbol?: string;
  costAllocationPct?: string | number;
  fractionalCashInLieu?: string | number;
  createdAt?: string;
}

export interface CreateCorporateActionRequest {
  type: CorporateActionType;
  ratioFrom: number;
  ratioTo: number;
  exDate: string;
  notes?: string;
  targetInstrumentId?: string;
  costAllocationPct?: number;
  fractionalCashInLieu?: number;
}

export interface UpdateCorporateActionRequest {
  type?: CorporateActionType;
  ratioFrom?: number;
  ratioTo?: number;
  exDate?: string;
  notes?: string;
  targetInstrumentId?: string;
  costAllocationPct?: number;
  fractionalCashInLieu?: number;
}

// Imports (Phase 4a / 4b / 4c)
export type ImportSource = 'zerodha_tradebook' | 'mf_cas' | 'groww';
export type ImportMatchStatus = 'matched' | 'unmatched';

export interface ParsedImportRow {
  rowIndex?: number;
  kind: 'trade' | 'dividend';
  type?: InvestmentTransactionType;
  parsedSymbol?: string;
  parsedIsin?: string;
  parsedName?: string;
  exchange?: string;
  quantity?: string | number;
  price?: string | number;
  amount?: string | number;
  tradeDate: string;
  charges?: Charges;
  externalRef?: string;
  rawData?: Record<string, any>;
  error?: string;
}

export interface ImportRow {
  rowIndex: number;
  parsedRow: ParsedImportRow;
  matchStatus: ImportMatchStatus;
  matchedInstrument?: {
    id: string;
    name: string;
    symbol?: string;
    type?: InstrumentType;
    exchange?: string;
    isin?: string;
  };
  duplicate: boolean;
}

export interface ImportSummary {
  total: number;
  matched: number;
  unmatched: number;
  duplicates: number;
  errors: number;
  note?: string;
}

export interface ImportPreview {
  rows: ImportRow[];
  summary: ImportSummary;
}

export interface ImportCommitRow {
  rowIndex: number;
  row: ParsedImportRow;
  instrumentId?: string;
  newInstrument?: CreateInstrumentRequest;
  skip?: boolean;
}

export interface ImportCommitRequest {
  source: ImportSource;
  brokerAccountId: string;
  rows: ImportCommitRow[];
}

export interface ImportCommitFailure {
  rowIndex: number;
  scrip?: string | null;
  reason: string;
}

export interface ImportCommitSkipped {
  rowIndex: number;
  scrip?: string | null;
  reason: string;
}

export interface ImportCommitResult {
  committed: number;
  skipped: number;
  failed: ImportCommitFailure[];
  skippedItems: ImportCommitSkipped[];
}

// Broker Reconciliation Types
export type ReconciliationBroker = 'zerodha' | 'groww';

export interface ReconciledExecution {
  rowIndex: number;
  tradeDate: string;
  type: InvestmentTransactionType;
  settlementType: 'delivery' | 'intraday';
  symbol: string;
  isin?: string;
  exchange: string;
  quantity: number | string;
  price: number | string;
  totalValue: number | string;
  charges?: Charges;
  externalRef?: string;
  matchedInstrument?: {
    id: string;
    type: InstrumentType;
    name: string;
    symbol?: string;
    exchange?: string;
    isin?: string;
  };
  isDuplicate: boolean;
  note?: string;
  suggestedType?: InstrumentType;
  underlyingSymbol?: string;
  expiryDate?: string;
  optionType?: OptionType;
  strikePrice?: string;
  lotSize?: number;
  tradingSymbol?: string;
}

export interface DerivedHolding {
  instrumentId?: string;
  symbol: string;
  isin?: string;
  name: string;
  quantity: number | string;
  avgCost: number | string;
  costValue: number | string;
}

export interface RealizedSummary {
  deliveryRealized: number | string;
  intradayRealized: number | string;
  totalCharges: number | string;
  classifierDeliveryRealized: number | string;
  classifierIntradayRealized: number | string;
  deliveryDiff: number | string;
  intradayDiff: number | string;
}

export interface ReconcileWarning {
  type: 'DATA_GAP' | 'BUYBACK_EXIT' | 'UNRESOLVED_INSTRUMENT';
  severity: 'WARNING' | 'INFO';
  isin?: string;
  symbol?: string;
  message: string;
}

export interface SummaryStats {
  totalExecutions: number;
  deliveryExecutions: number;
  intradayExecutions: number;
  matchedInstruments: number;
  unresolvedInstruments: number;
  duplicates: number;
  warningsCount: number;
}

export interface TradeSettlementClassification {
  isin?: string;
  symbol?: string;
  tradeDate: string;
  intradayQty: number | string;
  intradayBuyValue: number | string;
  intradaySellValue: number | string;
}

export interface ReconcilePreview {
  executions: ReconciledExecution[];
  derivedHoldings: DerivedHolding[];
  realizedSummary?: RealizedSummary | null;
  warnings: ReconcileWarning[];
  summaryStats: SummaryStats;
  classifications?: TradeSettlementClassification[];
}

export interface CommitExecutionDto {
  rowIndex: number;
  tradeDate: string;
  type: InvestmentTransactionType;
  settlementType: 'delivery' | 'intraday';
  symbol: string;
  isin?: string;
  exchange: string;
  quantity: number | string;
  price: number | string;
  charges?: Charges;
  externalRef?: string;
  instrumentId?: string;
  newInstrument?: CreateInstrumentRequest;
  skip?: boolean;
}

export interface ReconcileCommitRequest {
  broker: ReconciliationBroker;
  brokerAccountId: string;
  executions: CommitExecutionDto[];
  classifications?: TradeSettlementClassification[];
}

// SIPs (Phase 5)
export type SipFrequency = 'weekly' | 'monthly';

export interface SipProgress {
  expectedInstallments: number;
  executedInstallments: number;
  investedSoFar: string | number;
  unitsAccumulated: string | number;
  avgCost: string | number;
  nextDueDate?: string;
  missedInstallments: number;
}

export interface Sip {
  id: string;
  brokerAccountId: string;
  brokerName?: string;
  instrumentId: string;
  instrumentName?: string;
  symbol?: string;
  amount: string | number;
  frequency: SipFrequency;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  active: boolean;
  notes?: string;
  progress?: SipProgress;
  createdAt?: string;
}

export interface CreateSipRequest {
  brokerAccountId: string;
  instrumentId: string;
  amount: number;
  frequency: SipFrequency;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  active?: boolean;
  notes?: string;
}

// Note: a SIP's brokerAccountId/instrumentId are its identity and are NOT editable
// (the server's UpdateSipRequest does not accept them). To change them, delete + recreate.
export interface UpdateSipRequest {
  amount: number;
  frequency: SipFrequency;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  active: boolean;
  notes?: string;
}

// Dashboard
export interface CategoryBreakdown {
  category: string;
  amount: string;
  percentage: string;
}

export interface DashboardSummary {
  netWorth: string;
  totalAssets: string;
  totalLiabilities: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  categoryBreakdown: CategoryBreakdown[];
  status?: string;
}

// Gmail
export type GmailFetchMode = 'MANUAL' | 'PERIODIC';

export interface GmailOAuthStartResponse {
  authorizationUrl: string;
}

export interface GmailSenderRequest {
  name?: string;
  senderAddress: string;
  enabled?: boolean;
}

export interface GmailSenderResponse {
  id: string;
  name?: string;
  senderAddress: string;
  enabled: boolean;
}

export interface GmailConnectionResponse {
  id: string;
  email: string;
  isConnected: boolean;
  isPrimary: boolean;
  connectedAt: string;
  lastSyncedAt?: string | null;
}

export interface SyncSummary {
  fetched: number;
  created: number;
  skipped: number;
  failed: number;
  reconciled: number;
}

export interface GmailAttachmentDto {
  attachmentId: string;
  filename: string;
  mimeType: string;
  contentLength: number;
}

export interface GmailMessageDto {
  messageId: string;
  internalDate: string;
  from: string;
  subject: string;
  attachments?: GmailAttachmentDto[];
}

export interface GmailSyncStateDto {
  historyId: string;
  lastSyncedAt: string;
}

export interface GmailFetchResult {
  messages: GmailMessageDto[];
  nextState?: GmailSyncStateDto;
}

// Error
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string>;
  timestamp: string;
}

// Ingestion
export interface FileSummary {
  filename: string;
  status: 'SUCCESS' | 'FAILED';
  linesParsed: number;
  errorMessage: string | null;
}

export interface FileIngestionResult {
  filesProcessed: number;
  totalCreated: number;
  totalDuplicatesFound: number;
  fileDetails: FileSummary[];
}

// API Result type for server actions
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorResponse };

import type { Page } from '@/lib/pagination';

export * from '@/lib/jobs.types';

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
export type InstrumentType = 'stock' | 'mutual_fund' | 'etf';

// User & Auth
export interface SignupRequest {
  email: string;
  password: string;
  inviteCode: string;
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
  displayName?: string | null;
  pictureUrl?: string | null;
  hasPassword?: boolean;
  createdAt: string;
}

export interface DeleteAccountRequest {
  password?: string;
  confirmEmail?: string;
}

export interface DeletionSummaryResponse {
  counts: Record<string, number>;
  total: number;
}


// Investments & Instruments
export type PriceSource = 'AMFI' | 'YAHOO' | 'MANUAL';

export interface Instrument {
  id: string;
  type: InstrumentType;
  name: string;
  symbol?: string | null;
  exchange?: string | null;
  isin?: string | null;
  amfiCode?: string | null;
  yahooSymbol?: string | null;
  currency: string;
  lastPrice?: string | number | null;
  lastPriceAsOf?: string | null;
  lastPriceSource?: PriceSource | null;
}

export interface PriceHistoryPoint {
  id?: string;
  asOf: string;
  close: string | number;
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
}

export interface InstrumentPricePreview {
  value: string | number;
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
  quantity: string | number;
  price: string | number;
  tradeDate: string;
  brokerage?: string | number;
  stt?: string | number;
  exchangeTxnCharges?: string | number;
  sebiCharges?: string | number;
  stampDuty?: string | number;
  gst?: string | number;
  dpCharges?: string | number;
  otherCharges?: string | number;
  totalCharges?: string | number;
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
  };
  quantity?: number | string | null;
  avgCost?: number | string | null;
  invested?: number | string | null;
  lastPrice?: number | string | null;
  lastPriceAsOf?: string | null;
  lastPriceSource?: PriceSource | null;
  currentValue?: number | string | null;
  unrealizedGainLoss?: number | string | null;
  unrealizedGainLossPercent?: number | string | null;
  realizedGainLoss?: number | string | null;
  totalCharges?: number | string | null;
  dividends?: number | string | null;
  xirr?: number | string | null;
  absoluteReturnPercent?: number | string | null;
  mergedIntoName?: string | null;
  mergedIntoDate?: string | null;
  buyQty?: number | string | null;
  buyValue?: number | string | null;
  avgBuy?: number | string | null;
  sellQty?: number | string | null;
  sellValue?: number | string | null;
  avgSell?: number | string | null;
  netQty?: number | string | null;
  unclosed?: boolean | null;
}

export interface InvestmentPositionResponse {
  positions: Position[];
}

export interface BrokerSummary {
  brokerAccountId: string;
  brokerName: string;
  provider: string;
  invested: string | number;
  currentValue: string | number;
  unrealized: string | number;
  realized: string | number;
  cashBalance?: string | number;
  totalCharges?: string | number;
}

export interface InstrumentTypeSummary {
  type: InstrumentType;
  invested?: string | number;
  currentValue: string | number;
  percentage: string | number;
}

export interface InvestmentSummary {
  totalInvested: string | number;
  totalCurrentValue: string | number;
  totalUnrealized: string | number;
  totalUnrealizedPercent: string | number;
  totalRealized: string | number;
  totalDividends: string | number;
  totalCharges: string | number;
  totalPnl: string | number;
  totalFnoRealized?: string | number;
  xirr?: string | number | null;
  absoluteReturnPercent?: string | number;
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
  amount: string | number;
  perUnit?: string | number;
  tds?: string | number;
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

export interface FyBucket {
  label: string;
  fromDate: string;
  toDate: string;
  amount: number | string;
  tds: number | string;
  net: number | string;
  count: number;
}

export interface DividendSummary {
  buckets: FyBucket[];
  totalAmount: number | string;
  totalTds: number | string;
  totalNet: number | string;
  totalCount: number;
}

export interface DividendSuggestion {
  holdingId: string;
  brokerAccountId: string;
  brokerName?: string;
  instrumentId: string;
  instrumentName?: string;
  symbol: string;
  exDate: string;
  perUnit: string | number;
  qtyHeld: string | number;
  estimatedAmount: string | number;
}

export interface DividendSuggestionsResponse {
  suggestions: DividendSuggestion[];
  scannedSymbols: number;
  skippedSymbols: string[];
}

export interface AcceptSuggestionItem {
  holdingId: string;
  exDate: string;
  payDate: string;
  amount: string | number;
  perUnit?: string | number;
  notes?: string;
}

export interface AcceptSuggestionsRequest {
  items: AcceptSuggestionItem[];
}

export interface AcceptSuggestionsResponse {
  created: Dividend[];
  skippedCount: number;
}

// Corporate Actions
export type CorporateActionType =
  | 'split'
  | 'bonus'
  | 'demerger'
  | 'merger'
  | 'BONUS'
  | 'SPLIT'
  | 'DIVIDEND'
  | 'RIGHTS'
  | 'MERGER'
  | 'DEMERGER'
  | 'SPINOFF'
  | 'BUYBACK'
  | 'CAPITAL_REDUCTION';

export type CorporateActionStatus = 'DRAFT' | 'APPLIED' | 'REVERTED' | 'CANCELLED';

export interface CorporateAction {
  id: string;
  instrumentId: string;
  instrumentName?: string;
  instrumentSymbol?: string;
  type?: CorporateActionType;
  actionType?: CorporateActionType;
  status?: CorporateActionStatus;
  recordDate?: string;
  exDate?: string;
  ratioFrom?: number;
  ratioTo?: number;
  ratioNumerator?: number;
  ratioDenominator?: number;
  cashPerShare?: number;
  notes?: string;
  targetInstrumentId?: string;
  targetInstrumentName?: string;
  targetInstrumentSymbol?: string;
  costAllocationPct?: number;
  fractionalCashInLieu?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCorporateActionRequest {
  instrumentId?: string;
  type?: CorporateActionType;
  actionType?: CorporateActionType;
  recordDate?: string;
  exDate?: string;
  ratioFrom?: number;
  ratioTo?: number;
  ratioNumerator?: number;
  ratioDenominator?: number;
  cashPerShare?: number;
  notes?: string;
  targetInstrumentId?: string;
  costAllocationPct?: number;
  fractionalCashInLieu?: number;
}

export interface UpdateCorporateActionRequest {
  instrumentId?: string;
  type?: CorporateActionType;
  actionType?: CorporateActionType;
  recordDate?: string;
  exDate?: string;
  ratioFrom?: number;
  ratioTo?: number;
  ratioNumerator?: number;
  ratioDenominator?: number;
  cashPerShare?: number;
  notes?: string;
  targetInstrumentId?: string;
  costAllocationPct?: number;
  fractionalCashInLieu?: number;
}

// Imports (Phase 4a / 4b / 4c)
export type ImportSource = 'zerodha_tradebook' | 'mf_cas' | 'groww';
export type ImportMatchStatus = 'matched' | 'unmatched' | string;

export interface ParsedImportRow {
  rowIndex?: number;
  kind?: 'trade' | 'dividend' | string;
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
  rawData?: Record<string, unknown>;
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
  jobId?: string;
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

export type FnoContractType = 'future' | 'option';

export interface FnoTradePreview {
  tradingSymbol: string;
  underlyingSymbol?: string;
  contractType: FnoContractType;
  optionType?: OptionType;
  strikePrice?: number;
  expiryDate?: string;
  quantity: number;
  buyValue: number;
  sellValue: number;
  totalCharges: number;
  realizedPnl: number;
  entryDate?: string;
  exitDate?: string;
  externalRef: string;
  isDuplicate: boolean;
}

export interface CommitFnoTradeDto {
  tradingSymbol: string;
  underlyingSymbol?: string;
  contractType: FnoContractType;
  optionType?: OptionType;
  strikePrice?: number;
  expiryDate?: string;
  quantity: number;
  buyValue: number;
  sellValue: number;
  totalCharges: number;
  entryDate?: string;
  exitDate?: string;
  externalRef: string;
  skip: boolean;
}

export interface FnoTradeResponse {
  id: string;
  brokerAccountId: string;
  brokerAccountName?: string;
  tradingSymbol: string;
  underlyingSymbol?: string;
  contractType: FnoContractType;
  optionType?: OptionType;
  strikePrice?: number;
  expiryDate?: string;
  quantity: number;
  buyValue: number;
  sellValue: number;
  totalCharges: number;
  realizedPnl: number;
  entryDate?: string;
  exitDate?: string;
  source: string;
  externalRef?: string;
  notes?: string;
  createdAt: string;
}

export interface FnoTradeListResponse {
  trades: FnoTradeResponse[];
  totalRealizedPnl: number;
}

export interface CreateFnoTradeRequest {
  brokerAccountId: string;
  tradingSymbol: string;
  underlyingSymbol?: string;
  contractType?: FnoContractType;
  optionType?: OptionType;
  strikePrice?: number;
  expiryDate?: string;
  quantity: number;
  buyValue: number;
  sellValue: number;
  totalCharges?: number;
  entryDate?: string;
  exitDate?: string;
  notes?: string;
}

export type UpdateFnoTradeRequest = CreateFnoTradeRequest;

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
  fnoTrades?: FnoTradePreview[];
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
  fnoTrades?: CommitFnoTradeDto[];
}

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

export interface SyncMessageOutcome {
  gmailMessageId: string;
  from: string;
  subject: string;
  receivedAt: string;
  attachmentFilename?: string | null;
  outcome:
    | 'EXTRACTION_FAILED'
    | 'ACCOUNT_UNRESOLVED'
    | 'DECRYPT_FAILED'
    | 'PARSE_FAILED'
    | 'NO_ATTACHMENT'
    | 'ERROR';
  reason: string;
  accountLast4?: string | null;
}

export interface SyncSummary {
  discovered?: number;
  processed?: number;
  created: number;
  reconciled: number;
  skipped: number;
  parked?: number;
  failedRetryable?: number;
  failedPermanent?: number;
  backlogRemaining?: number;
  // Legacy / fallback fields
  fetched?: number;
  failed?: number;
  alreadyProcessed?: number;
  nonTransaction?: number;
  attention?: SyncMessageOutcome[];
  attentionTruncated?: number;
}

export interface GmailAttentionItem {
  id: string;
  gmailMessageId: string;
  internalDate?: string | null;
  senderAddress?: string | null;
  subject?: string | null;
  status:
    | 'UNRESOLVED_ACCOUNT'
    | 'ACCOUNT_NOT_OPTED_IN'
    | 'FAILED_PERMANENT'
    | 'FAILED_RETRYABLE';
  extractedLast4?: string | null;
  error?: string | null;
  attemptCount: number;
  nextRetryAt?: string | null;
  discoveredAt: string;
}

export interface PagedGmailAttention {
  content: GmailAttentionItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface GmailCleanupPreview {
  count: number;
  before: string;
}

export interface GmailCleanupResult {
  deletedCount: number;
}

// Error
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string> | null;
  errorId?: string | null;
  timestamp?: string | null;
}

// Ingestion
export interface FileSummary {
  filename: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  linesParsed: number;
  errorMessage: string | null;
  warning?: string | null;
  created?: number;
  duplicates?: number;
}

export interface DuplicateDetail {
  date: string;
  amount: number;
  description: string;
  filename: string;
  transactionId: string;
  matchedTransactionId?: string | null;
}

export interface FileIngestionResult {
  filesProcessed: number;
  totalCreated: number;
  totalDuplicatesFound: number;
  fileDetails: FileSummary[];
  duplicateDetails?: DuplicateDetail[];
  duplicatesTruncated?: number;
}


// API Result type for server actions
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorResponse };

export type {
  AccountIdentifierKind,
  AccountIdentifierResponse,
  AssignAttentionRequest,
  AssignAttentionResponse,
  CreateAccountIdentifierRequest,
} from './api/types';
export * from './lending.types';
export * from './loan.types';


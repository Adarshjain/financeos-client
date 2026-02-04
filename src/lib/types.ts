// Types generated from API spec

export enum AccountType {
  BANK_ACCOUNT = 'bank_account',
  CREDIT_CARD = 'credit_card',
  STOCK = 'stock',
  MUTUAL_FUND = 'mutual_fund',
  GENERIC = 'generic',
}
export type FinancialPosition = 'asset' | 'liability';
export type InvestmentTransactionType = 'buy' | 'sell';

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


// Investments
export interface CreateInvestmentTransactionRequest {
  accountId: string;
  type: InvestmentTransactionType;
  quantity: string;
  price: string;
  date: string;
  metadata?: Record<string, unknown>;
}

export interface InvestmentTransactionResponse {
  id: string;
  accountId: string;
  type: InvestmentTransactionType;
  quantity: string;
  price: string;
  date: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PagedInvestmentTransactionResponse {
  content: InvestmentTransactionResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface Position {
  accountId: string;
  instrumentCode: string;
  accountName: string;
  quantity: string;
  averageCost: string;
  totalCost: string;
  lastTradedPrice: string;
  currentValue: string;
  unrealizedGainLoss: string;
  unrealizedGainLossPercent: string;
}

export interface InvestmentPositionResponse {
  positions: Position[];
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

export interface GmailOAuthCallbackResponse {
  status: string;
  message: string;
  email?: string;
}

export interface GmailFetchRequest {
  mode?: GmailFetchMode;
  fromTime?: string;
  maxMessages?: number;
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

// API Result type for server actions
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorResponse };

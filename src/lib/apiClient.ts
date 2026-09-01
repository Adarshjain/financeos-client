import { cookies, headers } from 'next/headers';

import { Account, AccountRequest } from '@/lib/account.types';
import { CategorizeResponse, Category, CategoryRequest } from '@/lib/categories.types';
import type {
  CreateDashboardRequest,
  DashboardResponse,
  UpdateDashboardRequest,
} from '@/lib/dashboards.types';
import type {
  CounterpartyResponse,
  CreateCounterpartyRequest,
  CreateLendingRequest,
  LendingResponse,
  ObligationsResponse,
  UpdateCounterpartyRequest,
  UpdateLendingRequest,
} from '@/lib/lending.types';
import type {
  CreateLlmKeyRequest,
  LlmBucketHealthDto,
  LlmKeyDto,
  LlmRoutingDto,
  LlmRoutingGroupDto,
  LlmTaskGroupDto,
  ProviderCatalogDto,
  RoutingOptionDto,
  TestKeyResponse,
  UpdateRoutingRequest,
} from '@/lib/llmKey.types';
import type {
  BatchLoanPaymentRequest,
  CreateLoanChargeRequest,
  CreateLoanEventRequest,
  CreateLoanPaymentRequest,
  CreateLoanRequest,
  InstallmentDto,
  LoanChargeResponse,
  LoanDetailResponse,
  LoanEventResponse,
  LoanPaymentResponse,
  LoanResponse,
  LoansSummaryResponse,
  LoanStatus,
  MatchSuggestionsResponse,
  UpdateLoanRequest,
} from '@/lib/loan.types';
import { logger } from '@/lib/observability/logger';
import type { Page } from '@/lib/pagination';
import type {
  CreateReportRequest,
  ReportCatalog,
  ReportData,
  ReportResponse,
  ReportRunOptions,
  ReportSummaryResponse,
  ReportType,
  RunReportRequest,
  UpdateReportRequest,
} from '@/lib/reports.types';
import type { PagedRewardLines, ReorderRewardRulesRequest, RewardAccountConfig, RewardAccountConfigRequest, RewardCapBucket, RewardCapBucketRequest, RewardMilestone, RewardMilestoneRequest, RewardRecommendationRequest, RewardRecommendationResponse, RewardReport, RewardRule, RewardRuleRequest } from '@/lib/rewards.types';
import type { ApplyRuleRequest, ApplyRuleResult, CategoryRule, CreateRuleRequest, PagedRuleMatches, PagedRules, PreviewMatchesRequest, UpdateRuleRequest } from '@/lib/rules.types';
import { BatchDeleteRequest, BatchDeleteResponse, BatchReviewRequest, BatchReviewResponse, CreateTransactionLinkRequest, MergeTransactionsRequest, MergeTransactionsResponse, PagedTransaction, Transaction, TransactionLinkResponse, TransactionRequest, TransactionSearchRequest } from '@/lib/transaction.types';

import type {
  AcceptSuggestionsRequest,
  AcceptSuggestionsResponse,
  CorporateAction,
  CreateCorporateActionRequest,
  CreateDividendRequest,
  CreateFnoTradeRequest,
  CreateInstrumentRequest,
  CreateInvestmentTransactionRequest,
  DeleteAccountRequest,
  DeletionSummaryResponse,
  Dividend,
  DividendSuggestionsResponse,
  DividendSummary,
  DividendType,
  EnqueueResponse,
  ErrorResponse,
  FileIngestionResult,
  FnoTradeListResponse,
  FnoTradeResponse,
  GmailConnectionResponse,
  GmailOAuthStartResponse,
  GmailSenderRequest,
  GmailSenderResponse,
  GoogleAuthStartResponse,
  ImportCommitRequest,
  ImportCommitResult,
  ImportPreview,
  Instrument,
  InstrumentCandidate,
  InstrumentType,
  InvestmentPositionResponse,
  InvestmentSummary,
  InvestmentTransactionResponse,
  JobResponse,
  LoginRequest,
  PagedDividendResponse,
  PagedInvestmentTransactionResponse,
  PagedJobResponse,
  PriceHistoryPoint,
  PriceRefreshResult,
  ReconcileCommitRequest,
  ReconcilePreview,
  ResolveInstrumentRequest,
  SetPriceRequest,
  SignupRequest,
  SyncSummary,
  UpdateCorporateActionRequest,
  UpdateDividendRequest,
  UpdateFnoTradeRequest,
  UpdateInvestmentTransactionRequest,
  UserResponse,
} from './types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:6969';

class ApiError extends Error {
  constructor(
    public status: number,
    public response: ErrorResponse,
  ) {
    super(response.message);
    this.name = 'ApiError';
  }
}

async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('FINANCEOS_SESSION')?.value;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const sessionCookie = await getSessionCookie();

  let requestId: string | undefined;
  let sessionId: string | undefined;
  try {
    const headerStore = await headers();
    requestId = headerStore.get('x-request-id') ?? undefined;
    sessionId = headerStore.get('x-session-id') ?? undefined;
  } catch {
    // Outside request context
  }

  const reqHeaders: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }
  if (options.headers) {
    Object.assign(reqHeaders, options.headers);
  }

  if (sessionCookie) {
    reqHeaders['Cookie'] = `FINANCEOS_SESSION=${sessionCookie}`;
  }
  if (requestId) {
    reqHeaders['X-Request-Id'] = requestId;
  }
  if (sessionId) {
    reqHeaders['X-Session-Id'] = sessionId;
  }

  const startMs = Date.now();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: reqHeaders,
      cache: 'no-store',
    });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    logger.log('ERROR', 'client.api.call', {
      endpoint,
      status: 0,
      durationMs,
      requestId,
      sessionId,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  const durationMs = Date.now() - startMs;
  logger.log('INFO', 'client.api.call', {
    endpoint,
    status: response.status,
    durationMs,
    requestId,
    sessionId,
  });

  if (!response.ok) {
    let errorResponse: ErrorResponse;
    try {
      errorResponse = await response.json();
    } catch {
      errorResponse = {
        code: 'UNKNOWN_ERROR',
        message: `Request failed with status ${response.status}`,
        timestamp: new Date().toISOString(),
      };
    }
    throw new ApiError(response.status, errorResponse);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

// Auth API
export const authApi = {
  async signup(data: SignupRequest): Promise<UserResponse> {
    const response = await fetch(`${API_BASE}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store',
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new ApiError(response.status, error);
    }

    return response.json();
  },

  async login(
    data: LoginRequest,
  ): Promise<{ user: UserResponse; sessionCookie?: string }> {
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store',
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new ApiError(response.status, error);
    }

    const user: UserResponse = await response.json();
    const setCookie = response.headers.get('set-cookie');

    // Extract session cookie value
    let sessionCookie: string | undefined;
    if (setCookie) {
      const match = setCookie.match(/FINANCEOS_SESSION=([^;]+)/);
      if (match) {
        sessionCookie = match[1];
      }
    }

    return { user, sessionCookie };
  },

  async logout(): Promise<void> {
    await request('/api/v1/auth/logout', { method: 'POST' });
  },

  async getCurrentUser(): Promise<UserResponse> {
    return request<UserResponse>('/api/v1/auth/me');
  },

  async startGoogleAuth(): Promise<GoogleAuthStartResponse> {
    return request<GoogleAuthStartResponse>('/api/v1/auth/google/start');
  },

  async handleGoogleCallback(params: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<{ user: UserResponse; sessionCookie?: string }> {
    const query = new URLSearchParams();
    if (params.code) query.set('code', params.code);
    if (params.state) query.set('state', params.state);
    if (params.error) query.set('error', params.error);

    const response = await fetch(
      `${API_BASE}/api/v1/auth/google/callback?${query.toString()}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new ApiError(response.status, error);
    }

    const user: UserResponse = await response.json();
    const setCookie = response.headers.get('set-cookie');

    // Extract session cookie value
    let sessionCookie: string | undefined;
    if (setCookie) {
      const match = setCookie.match(/FINANCEOS_SESSION=([^;]+)/);
      if (match) {
        sessionCookie = match[1];
      }
    }

    return { user, sessionCookie };
  },

  async getDeletionSummary(): Promise<DeletionSummaryResponse> {
    return request<DeletionSummaryResponse>('/api/v1/auth/me/deletion-summary');
  },

  async deleteAccount(data?: DeleteAccountRequest): Promise<void> {
    await request<void>('/api/v1/auth/me/delete', {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};

// Accounts API
export const accountsApi = {
  async list(): Promise<Account[]> {
    return request<Account[]>('/api/v1/accounts');
  },

  async create(data: AccountRequest): Promise<Account> {
    return request<Account>('/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: AccountRequest): Promise<Account> {
    return request<Account>(`/api/v1/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/accounts/${id}`, {
      method: 'DELETE',
    });
  },

  async close(id: string, data?: import('@/lib/account.types').CloseAccountRequest): Promise<Account> {
    return request<Account>(`/api/v1/accounts/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  async reopen(id: string): Promise<Account> {
    return request<Account>(`/api/v1/accounts/${id}/reopen`, {
      method: 'POST',
    });
  },

  async getCardCycleSummary(id: string): Promise<import('@/lib/statement.types').CardCycleSummary> {
    return request<import('@/lib/statement.types').CardCycleSummary>(`/api/v1/accounts/${id}/card-summary`);
  },

  async gmailCleanupPreview(id: string, before: string): Promise<import('@/lib/types').GmailCleanupPreview> {
    return request<import('@/lib/types').GmailCleanupPreview>(`/api/v1/accounts/${id}/gmail-cleanup-preview?before=${encodeURIComponent(before)}`);
  },

  async gmailCleanup(id: string, before: string): Promise<import('@/lib/types').GmailCleanupResult> {
    return request<import('@/lib/types').GmailCleanupResult>(`/api/v1/accounts/${id}/gmail-cleanup?before=${encodeURIComponent(before)}`, {
      method: 'POST',
    });
  },
};

// Statements API
export const statementsApi = {
  async listByAccount(accountId: string): Promise<import('@/lib/statement.types').StatementSummary[]> {
    return request<import('@/lib/statement.types').StatementSummary[]>(`/api/v1/accounts/${accountId}/statements`);
  },

  async getById(statementId: string): Promise<import('@/lib/statement.types').StatementDetail> {
    return request<import('@/lib/statement.types').StatementDetail>(`/api/v1/statements/${statementId}`);
  },
};

// Transactions API
export const transactionsApi = {

  async search(
    body: TransactionSearchRequest,
    page = 0,
    size = 50,
    sort = 'date,desc',
  ): Promise<PagedTransaction> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort,
    });
    return request<PagedTransaction>(`/api/v1/transactions/search?${params}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async create(data: TransactionRequest): Promise<Transaction> {
    return request<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: TransactionRequest): Promise<Transaction> {
    return request<Transaction>(`/api/v1/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  async batchReview(data: BatchReviewRequest): Promise<BatchReviewResponse> {
    return request<BatchReviewResponse>('/api/v1/transactions/batch-review', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async batchDelete(data: BatchDeleteRequest): Promise<BatchDeleteResponse> {
    return request<BatchDeleteResponse>('/api/v1/transactions/batch-delete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async merge(data: MergeTransactionsRequest): Promise<MergeTransactionsResponse> {
    return request<MergeTransactionsResponse>('/api/v1/transactions/merge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async bulkReattributeCard(data: import('@/lib/transaction.types').BulkReattributeCardRequest): Promise<import('@/lib/transaction.types').BulkReattributeResponse> {
    return request<import('@/lib/transaction.types').BulkReattributeResponse>('/api/v1/transactions/card', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Cardholders API
export const cardholdersApi = {
  async listByAccount(accountId: string): Promise<import('@/lib/account.types').Cardholder[]> {
    return request<import('@/lib/account.types').Cardholder[]>(`/api/v1/accounts/${accountId}/cardholders`);
  },

  async addAddon(accountId: string, data: import('@/lib/account.types').CreateCardholderRequest): Promise<import('@/lib/account.types').Cardholder> {
    return request<import('@/lib/account.types').Cardholder>(`/api/v1/accounts/${accountId}/cardholders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(accountId: string, cardholderId: string, data: import('@/lib/account.types').UpdateCardholderRequest): Promise<import('@/lib/account.types').Cardholder> {
    return request<import('@/lib/account.types').Cardholder>(`/api/v1/accounts/${accountId}/cardholders/${cardholderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async close(accountId: string, cardholderId: string, data?: import('@/lib/account.types').CloseCardholderRequest): Promise<import('@/lib/account.types').Cardholder> {
    return request<import('@/lib/account.types').Cardholder>(`/api/v1/accounts/${accountId}/cardholders/${cardholderId}/close`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async reopen(accountId: string, cardholderId: string): Promise<import('@/lib/account.types').Cardholder> {
    return request<import('@/lib/account.types').Cardholder>(`/api/v1/accounts/${accountId}/cardholders/${cardholderId}/reopen`, {
      method: 'POST',
    });
  },

  async delete(accountId: string, cardholderId: string): Promise<void> {
    return request<void>(`/api/v1/accounts/${accountId}/cardholders/${cardholderId}`, {
      method: 'DELETE',
    });
  },

  async addCard(accountId: string, cardholderId: string, data: import('@/lib/account.types').CreateCardRequest): Promise<import('@/lib/account.types').Cardholder> {
    return request<import('@/lib/account.types').Cardholder>(`/api/v1/accounts/${accountId}/cardholders/${cardholderId}/cards`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async replaceCard(accountId: string, cardholderId: string, cardId: string, data: import('@/lib/account.types').ReplaceCardRequest): Promise<import('@/lib/account.types').Cardholder> {
    return request<import('@/lib/account.types').Cardholder>(`/api/v1/accounts/${accountId}/cardholders/${cardholderId}/cards/${cardId}/replace`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async closeCard(accountId: string, cardholderId: string, cardId: string, data?: import('@/lib/account.types').CloseCardRequest): Promise<import('@/lib/account.types').Cardholder> {
    return request<import('@/lib/account.types').Cardholder>(`/api/v1/accounts/${accountId}/cardholders/${cardholderId}/cards/${cardId}/close`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  async deleteCard(accountId: string, cardholderId: string, cardId: string): Promise<void> {
    return request<void>(`/api/v1/accounts/${accountId}/cardholders/${cardholderId}/cards/${cardId}`, {
      method: 'DELETE',
    });
  },

  // Backward compatibility methods
  async create(accountId: string, data: import('@/lib/account.types').CreateCardholderRequest): Promise<import('@/lib/account.types').Cardholder> {
    return this.addAddon(accountId, data);
  },
  async replace(accountId: string, cardholderId: string, data: import('@/lib/account.types').ReplaceCardRequest): Promise<import('@/lib/account.types').Cardholder> {
    return this.replaceCard(accountId, cardholderId, cardholderId, data);
  },
};

export const accountCardsApi = cardholdersApi;


// Instruments API
export const instrumentsApi = {
  async search(search?: string, type?: string): Promise<Instrument[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    const query = params.toString();
    return request<Instrument[]>(`/api/v1/instruments${query ? `?${query}` : ''}`);
  },

  async catalogSearch(q: string, type?: InstrumentType): Promise<InstrumentCandidate[]> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    const query = params.toString();
    return request<InstrumentCandidate[]>(
      `/api/v1/instruments/catalog-search${query ? `?${query}` : ''}`,
    );
  },

  async resolveInstrument(req: ResolveInstrumentRequest): Promise<Instrument> {
    return request<Instrument>('/api/v1/instruments/resolve', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async create(data: CreateInstrumentRequest): Promise<Instrument> {
    return request<Instrument>('/api/v1/instruments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: CreateInstrumentRequest): Promise<Instrument> {
    return request<Instrument>(`/api/v1/instruments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async setPrice(id: string, data: SetPriceRequest): Promise<Instrument> {
    return request<Instrument>(`/api/v1/instruments/${id}/price`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPriceHistory(
    id: string,
    options?: { from?: string; to?: string },
  ): Promise<PriceHistoryPoint[]> {
    const params = new URLSearchParams();
    if (options?.from) params.set('from', options.from);
    if (options?.to) params.set('to', options.to);
    const query = params.toString();
    return request<PriceHistoryPoint[]>(
      `/api/v1/instruments/${id}/prices${query ? `?${query}` : ''}`,
    );
  },

  async updatePrice(
    instrumentId: string,
    priceId: string,
    data: { price: number | string },
  ): Promise<Instrument> {
    return request<Instrument>(
      `/api/v1/instruments/${instrumentId}/prices/${priceId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    );
  },

  async deletePrice(instrumentId: string, priceId: string): Promise<void> {
    return request<void>(
      `/api/v1/instruments/${instrumentId}/prices/${priceId}`,
      {
        method: 'DELETE',
      },
    );
  },
};

// Investments API
export const investmentsApi = {
  async listTransactions(
    page = 0,
    size = 50,
    filters?: { brokerAccountId?: string; instrumentId?: string; holdingId?: string; search?: string },
  ): Promise<PagedInvestmentTransactionResponse> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (filters?.brokerAccountId) params.set('brokerAccountId', filters.brokerAccountId);
    if (filters?.instrumentId) params.set('instrumentId', filters.instrumentId);
    if (filters?.holdingId) params.set('holdingId', filters.holdingId);
    if (filters?.search) params.set('search', filters.search);
    return request<PagedInvestmentTransactionResponse>(
      `/api/v1/investments/transactions?${params}`,
    );
  },

  async createTransaction(
    data: CreateInvestmentTransactionRequest,
  ): Promise<InvestmentTransactionResponse> {
    return request<InvestmentTransactionResponse>(
      '/api/v1/investments/transactions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },

  async updateTransaction(
    id: string,
    data: UpdateInvestmentTransactionRequest,
  ): Promise<InvestmentTransactionResponse> {
    return request<InvestmentTransactionResponse>(
      `/api/v1/investments/transactions/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    );
  },

  async deleteTransaction(id: string): Promise<void> {
    return request<void>(`/api/v1/investments/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  async getPositions(): Promise<InvestmentPositionResponse> {
    return request<InvestmentPositionResponse>('/api/v1/investments/positions');
  },

  async getSummary(): Promise<InvestmentSummary> {
    return request<InvestmentSummary>('/api/v1/investments/summary');
  },

  async refreshPrices(instrumentId?: string): Promise<EnqueueResponse> {
    const query = instrumentId ? `?instrumentId=${encodeURIComponent(instrumentId)}` : '';
    return request<EnqueueResponse>(`/api/v1/investments/prices/refresh${query}`, {
      method: 'POST',
    });
  },
};

// Dividends API
export const dividendsApi = {
  async list(filters?: {
    holdingId?: string;
    brokerAccountId?: string;
    instrumentId?: string;
    type?: DividendType;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Promise<PagedDividendResponse> {
    const params = new URLSearchParams({
      page: String(filters?.page ?? 0),
      size: String(filters?.size ?? 25),
    });
    if (filters?.holdingId) params.set('holdingId', filters.holdingId);
    if (filters?.brokerAccountId) params.set('brokerAccountId', filters.brokerAccountId);
    if (filters?.instrumentId) params.set('instrumentId', filters.instrumentId);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    return request<PagedDividendResponse>(`/api/v1/investments/dividends?${params}`);
  },

  async summary(filters?: {
    holdingId?: string;
    brokerAccountId?: string;
    instrumentId?: string;
    type?: DividendType;
  }): Promise<DividendSummary> {
    const params = new URLSearchParams();
    if (filters?.holdingId) params.set('holdingId', filters.holdingId);
    if (filters?.brokerAccountId) params.set('brokerAccountId', filters.brokerAccountId);
    if (filters?.instrumentId) params.set('instrumentId', filters.instrumentId);
    if (filters?.type) params.set('type', filters.type);
    const query = params.toString() ? `?${params}` : '';
    return request<DividendSummary>(`/api/v1/investments/dividends/summary${query}`);
  },

  async suggestions(brokerAccountId?: string): Promise<DividendSuggestionsResponse> {
    const params = new URLSearchParams();
    if (brokerAccountId) params.set('brokerAccountId', brokerAccountId);
    const query = params.toString() ? `?${params}` : '';
    return request<DividendSuggestionsResponse>(`/api/v1/investments/dividends/suggestions${query}`);
  },

  async acceptSuggestions(data: AcceptSuggestionsRequest): Promise<AcceptSuggestionsResponse> {
    return request<AcceptSuggestionsResponse>('/api/v1/investments/dividends/suggestions/accept', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async create(data: CreateDividendRequest): Promise<Dividend> {
    return request<Dividend>('/api/v1/investments/dividends', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateDividendRequest): Promise<Dividend> {
    return request<Dividend>(`/api/v1/investments/dividends/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/investments/dividends/${id}`, {
      method: 'DELETE',
    });
  },
};

// Futures & Options (FnO) API
export const fnoApi = {
  async listTrades(): Promise<FnoTradeListResponse> {
    return request<FnoTradeListResponse>('/api/v1/investments/fno');
  },

  async createTrade(data: CreateFnoTradeRequest): Promise<FnoTradeResponse> {
    return request<FnoTradeResponse>('/api/v1/investments/fno', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTrade(id: string, data: UpdateFnoTradeRequest): Promise<FnoTradeResponse> {
    return request<FnoTradeResponse>(`/api/v1/investments/fno/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTrade(id: string): Promise<void> {
    return request<void>(`/api/v1/investments/fno/${id}`, {
      method: 'DELETE',
    });
  },
};

// Corporate Actions API
export const corporateActionsApi = {
  async listAll(): Promise<CorporateAction[]> {
    return request<CorporateAction[]>('/api/v1/corporate-actions');
  },

  async list(instrumentId: string): Promise<CorporateAction[]> {
    return request<CorporateAction[]>(`/api/v1/instruments/${instrumentId}/corporate-actions`);
  },

  async create(instrumentId: string, data: CreateCorporateActionRequest): Promise<CorporateAction> {
    return request<CorporateAction>(`/api/v1/instruments/${instrumentId}/corporate-actions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(instrumentId: string, id: string, data: UpdateCorporateActionRequest): Promise<CorporateAction> {
    return request<CorporateAction>(`/api/v1/instruments/${instrumentId}/corporate-actions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(instrumentId: string, id: string): Promise<void> {
    return request<void>(`/api/v1/instruments/${instrumentId}/corporate-actions/${id}`, {
      method: 'DELETE',
    });
  },
};

// Imports API (Phase 4a & Reconciliation)
export const importsApi = {
  async preview(formData: FormData): Promise<ImportPreview> {
    return request<ImportPreview>('/api/v1/investments/imports/preview', {
      method: 'POST',
      body: formData,
    });
  },

  async commit(data: ImportCommitRequest): Promise<EnqueueResponse> {
    return request<EnqueueResponse>('/api/v1/investments/imports/commit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async previewReconcile(formData: FormData): Promise<ReconcilePreview> {
    return request<ReconcilePreview>('/api/v1/investments/imports/reconcile/preview', {
      method: 'POST',
      body: formData,
    });
  },

  async commitReconcile(data: ReconcileCommitRequest): Promise<EnqueueResponse> {
    return request<EnqueueResponse>('/api/v1/investments/imports/reconcile/commit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Gmail API
export const gmailApi = {
  async startOAuth(): Promise<GmailOAuthStartResponse> {
    return request<GmailOAuthStartResponse>('/api/v1/gmail/oauth/start');
  },

  async sync(): Promise<EnqueueResponse> {
    return request<EnqueueResponse>('/api/v1/gmail/sync', {
      method: 'POST',
    });
  },

  async listSenders(): Promise<GmailSenderResponse[]> {
    return request<GmailSenderResponse[]>('/api/v1/gmail/senders');
  },

  async createSender(data: GmailSenderRequest): Promise<GmailSenderResponse> {
    return request<GmailSenderResponse>('/api/v1/gmail/senders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSender(id: string, data: GmailSenderRequest): Promise<GmailSenderResponse> {
    return request<GmailSenderResponse>(`/api/v1/gmail/senders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSender(id: string): Promise<void> {
    return request<void>(`/api/v1/gmail/senders/${id}`, {
      method: 'DELETE',
    });
  },

  async listConnections(): Promise<GmailConnectionResponse[]> {
    return request<GmailConnectionResponse[]>('/api/v1/gmail/connections');
  },

  async disconnectConnection(id: string): Promise<void> {
    return request<void>(`/api/v1/gmail/connections/${id}`, {
      method: 'DELETE',
    });
  },

  async getAttentionItems(page = 0, size = 20, includeRetryable = false): Promise<import('@/lib/types').PagedGmailAttention> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      includeRetryable: String(includeRetryable),
    });
    return request<import('@/lib/types').PagedGmailAttention>(`/api/v1/gmail/attention?${params}`);
  },

  async retryAttentionItem(ledgerId: string): Promise<EnqueueResponse> {
    return request<EnqueueResponse>(`/api/v1/gmail/attention/${ledgerId}/retry`, {
      method: 'POST',
    });
  },

  async rescan(fromDate: string): Promise<EnqueueResponse> {
    return request<EnqueueResponse>('/api/v1/gmail/rescan', {
      method: 'POST',
      body: JSON.stringify({ fromDate }),
    });
  },
};

export const categoriesApi = {
  async list(): Promise<Category[]> {
    return request<Category[]>('/api/v1/categories');
  },

  async create(data: CategoryRequest): Promise<Category> {
    return request<Category>('/api/v1/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async categorizeDescription(description: string): Promise<CategorizeResponse> {
    return request<CategorizeResponse>('/api/v1/categorize', {
      method: 'POST',
      body: JSON.stringify({ description }),
    });
  },
};

function buildPageQuery(options: ReportRunOptions): string {
  const params = new URLSearchParams();
  if (options.page !== undefined) params.set('page', String(options.page));
  if (options.size !== undefined) params.set('size', String(options.size));
  const query = params.toString();
  return query ? `?${query}` : '';
}

// Reports API
export const reportsApi = {
  // Field + operator catalog used to build report definitions.
  async getDatasource(): Promise<ReportCatalog> {
    return request<ReportCatalog>('/api/v1/report/datasource');
  },

  // Create and save a report definition.
  async create(data: CreateReportRequest): Promise<ReportResponse> {
    return request<ReportResponse>('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // List the current user's report summaries; optionally filter by type.
  async list(type?: ReportType): Promise<ReportSummaryResponse[]> {
    const query = type ? `?${new URLSearchParams({ type })}` : '';
    return request<ReportSummaryResponse[]>(`/api/v1/reports${query}`);
  },

  // Get one saved report, including its definition.
  async getById(id: string): Promise<ReportResponse> {
    return request<ReportResponse>(`/api/v1/reports/${id}`);
  },

  // Update a saved report's name + definition (type/datasource immutable).
  async update(id: string, data: UpdateReportRequest): Promise<ReportResponse> {
    return request<ReportResponse>(`/api/v1/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete a saved report.
  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/reports/${id}`, {
      method: 'DELETE',
    });
  },

  // Run a SAVED report and return computed data. page/size apply to TABLE
  // reports only (current page is a runtime param, not part of the definition).
  async runSaved(
    id: string,
    options: ReportRunOptions = {},
  ): Promise<ReportData> {
    return request<ReportData>(
      `/api/v1/reports/${id}/data${buildPageQuery(options)}`,
      { method: 'POST' },
    );
  },

  // Run an AD-HOC (unsaved) definition and return computed data — use for live
  // preview while the user is building. page/size apply to TABLE reports.
  async runAdHoc(
    data: RunReportRequest,
    options: ReportRunOptions = {},
  ): Promise<ReportData> {
    return request<ReportData>(
      `/api/v1/reports/data${buildPageQuery(options)}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },
};

// Dashboards API
// A dashboard arranges report widgets on a grid DASHBOARD_GRID_COLUMNS wide. It
// stores no query
// logic: to render one, call getById, then run each widget's report via
// reportsApi.runSaved(widget.reportId, { page, size }) — page/size for TABLE
// widgets — and render the returned ReportData by its type. Skip widgets whose
// report.available is false.
export const dashboardsApi = {
  // Create a dashboard.
  async create(data: CreateDashboardRequest): Promise<DashboardResponse> {
    return request<DashboardResponse>('/api/v1/dashboards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // List the current user's dashboards (summaries, with a widget count).
  async list(): Promise<DashboardResponse[]> {
    return request<DashboardResponse[]>('/api/v1/dashboards');
  },

  // Get one dashboard; widgets are enriched with referenced-report metadata.
  async getById(id: string): Promise<DashboardResponse> {
    return request<DashboardResponse>(`/api/v1/dashboards/${id}`);
  },

  // Update a dashboard — replaces name, description, and the FULL widget set.
  async update(
    id: string,
    data: UpdateDashboardRequest,
  ): Promise<DashboardResponse> {
    return request<DashboardResponse>(`/api/v1/dashboards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete a dashboard.
  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/dashboards/${id}`, {
      method: 'DELETE',
    });
  },
};

// Ingestion API
export const ingestionApi = {
  async ingest(accountId: string, formData: FormData): Promise<EnqueueResponse> {
    return request<EnqueueResponse>(`/api/v1/accounts/${accountId}/ingest`, {
      method: 'POST',
      body: formData,
    });
  },
};

// Rules API
export const rulesApi = {
  async list(params: {
    page?: number;
    size?: number;
    sort?: string;
    verified?: boolean;
    search?: string;
  } = {}): Promise<PagedRules> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.sort !== undefined) query.set('sort', params.sort);
    if (params.verified !== undefined) query.set('verified', String(params.verified));
    if (params.search !== undefined && params.search !== '') query.set('search', params.search);
    return request<PagedRules>(`/api/v1/rules?${query}`);
  },

  async create(body: CreateRuleRequest): Promise<CategoryRule> {
    return request<CategoryRule>('/api/v1/rules', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async update(id: string, body: UpdateRuleRequest): Promise<CategoryRule> {
    return request<CategoryRule>(`/api/v1/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async verify(id: string): Promise<CategoryRule> {
    return request<CategoryRule>(`/api/v1/rules/${id}/verify`, {
      method: 'POST',
    });
  },

  async remove(id: string): Promise<void> {
    return request<void>(`/api/v1/rules/${id}`, {
      method: 'DELETE',
    });
  },

  async previewMatches(
    body: PreviewMatchesRequest,
    params: { page?: number; size?: number } = {},
  ): Promise<PagedRuleMatches> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    return request<PagedRuleMatches>(`/api/v1/rules/preview-matches?${query}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async apply(id: string, body: ApplyRuleRequest): Promise<EnqueueResponse> {
    return request<EnqueueResponse>(`/api/v1/rules/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

// Jobs API
export const jobsApi = {
  async list(params: {
    page?: number;
    size?: number;
    status?: string;
    type?: string;
  } = {}): Promise<PagedJobResponse> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.status !== undefined && params.status !== '') query.set('status', params.status);
    if (params.type !== undefined && params.type !== '') query.set('type', params.type);
    return request<PagedJobResponse>(`/api/v1/jobs?${query}`);
  },

  async get(id: string): Promise<JobResponse> {
    return request<JobResponse>(`/api/v1/jobs/${id}`);
  },

  async cancel(id: string): Promise<JobResponse> {
    return request<JobResponse>(`/api/v1/jobs/${id}/cancel`, {
      method: 'POST',
    });
  },

  async retry(id: string): Promise<JobResponse> {
    return request<JobResponse>(`/api/v1/jobs/${id}/retry`, {
      method: 'POST',
    });
  },
};

// Loans API
export const loansApi = {
  async list(status?: LoanStatus, page = 0, size = 50): Promise<Page<LoanResponse>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.append('status', status);
    return request<Page<LoanResponse>>(`/api/v1/loans?${params.toString()}`);
  },

  async getSummary(): Promise<LoansSummaryResponse> {
    return request<LoansSummaryResponse>('/api/v1/loans/summary');
  },

  async getDetail(id: string): Promise<LoanDetailResponse> {
    return request<LoanDetailResponse>(`/api/v1/loans/${id}`);
  },

  async getSchedule(id: string): Promise<{ installments: InstallmentDto[] }> {
    return request<{ installments: InstallmentDto[] }>(`/api/v1/loans/${id}/schedule`);
  },

  async create(data: CreateLoanRequest): Promise<LoanResponse> {
    return request<LoanResponse>('/api/v1/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateLoanRequest): Promise<LoanResponse> {
    return request<LoanResponse>(`/api/v1/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<void> {
    return request<void>(`/api/v1/loans/${id}`, {
      method: 'DELETE',
    });
  },

  async close(id: string): Promise<void> {
    return request<void>(`/api/v1/loans/${id}/close`, {
      method: 'POST',
    });
  },

  async reopen(id: string): Promise<void> {
    return request<void>(`/api/v1/loans/${id}/reopen`, {
      method: 'POST',
    });
  },

  async addEvent(id: string, data: CreateLoanEventRequest): Promise<LoanEventResponse> {
    return request<LoanEventResponse>(`/api/v1/loans/${id}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteEvent(id: string, eventId: string): Promise<void> {
    return request<void>(`/api/v1/loans/${id}/events/${eventId}`, {
      method: 'DELETE',
    });
  },

  async addPayment(id: string, data: CreateLoanPaymentRequest): Promise<LoanPaymentResponse> {
    return request<LoanPaymentResponse>(`/api/v1/loans/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addPaymentsBatch(id: string, data: BatchLoanPaymentRequest): Promise<{ created: number }> {
    return request<{ created: number }>(`/api/v1/loans/${id}/payments/batch`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deletePayment(id: string, paymentId: string): Promise<void> {
    return request<void>(`/api/v1/loans/${id}/payments/${paymentId}`, {
      method: 'DELETE',
    });
  },

  async addCharge(id: string, data: CreateLoanChargeRequest): Promise<LoanChargeResponse> {
    return request<LoanChargeResponse>(`/api/v1/loans/${id}/charges`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteCharge(id: string, chargeId: string): Promise<void> {
    return request<void>(`/api/v1/loans/${id}/charges/${chargeId}`, {
      method: 'DELETE',
    });
  },

  async getMatchSuggestions(id: string): Promise<MatchSuggestionsResponse> {
    return request<MatchSuggestionsResponse>(`/api/v1/loans/${id}/match-suggestions`);
  },
};

// Counterparties API
export const counterpartiesApi = {
  async list(page = 0, size = 50): Promise<Page<CounterpartyResponse>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    return request<Page<CounterpartyResponse>>(`/api/v1/counterparties?${params.toString()}`);
  },

  async create(data: CreateCounterpartyRequest): Promise<CounterpartyResponse> {
    return request<CounterpartyResponse>('/api/v1/counterparties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateCounterpartyRequest): Promise<CounterpartyResponse> {
    return request<CounterpartyResponse>(`/api/v1/counterparties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<void> {
    return request<void>(`/api/v1/counterparties/${id}`, {
      method: 'DELETE',
    });
  },
};

// Lendings API
export const lendingsApi = {
  async list(counterpartyId?: string, page = 0, size = 50): Promise<Page<LendingResponse>> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (counterpartyId) params.append('counterpartyId', counterpartyId);
    return request<Page<LendingResponse>>(`/api/v1/lendings?${params.toString()}`);
  },

  async getDetail(id: string): Promise<LendingResponse> {
    return request<LendingResponse>(`/api/v1/lendings/${id}`);
  },

  async create(data: CreateLendingRequest): Promise<LendingResponse> {
    return request<LendingResponse>('/api/v1/lendings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateLendingRequest): Promise<LendingResponse> {
    return request<LendingResponse>(`/api/v1/lendings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(id: string): Promise<void> {
    return request<void>(`/api/v1/lendings/${id}`, {
      method: 'DELETE',
    });
  },
};

// Obligations API
export const obligationsApi = {
  async getUpcoming(months = 3): Promise<ObligationsResponse> {
    return request<ObligationsResponse>(`/api/v1/obligations/upcoming?months=${months}`);
  },
};

// Transaction Links API
export const transactionLinksApi = {
  async create(data: CreateTransactionLinkRequest): Promise<TransactionLinkResponse> {
    return request<TransactionLinkResponse>('/api/v1/transaction-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getByTransactionId(transactionId: string): Promise<TransactionLinkResponse[]> {
    return request<TransactionLinkResponse[]>(`/api/v1/transaction-links?transactionId=${encodeURIComponent(transactionId)}`);
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/transaction-links/${id}`, {
      method: 'DELETE',
    });
  },
};

export const rewardsApi = {
  async listRules(accountId: string): Promise<RewardRule[]> {
    return request<RewardRule[]>(`/api/v1/reward-rules?accountId=${accountId}`);
  },

  async createRule(body: RewardRuleRequest): Promise<RewardRule> {
    return request<RewardRule>('/api/v1/reward-rules', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updateRule(id: string, body: RewardRuleRequest): Promise<RewardRule> {
    return request<RewardRule>(`/api/v1/reward-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async deleteRule(id: string): Promise<void> {
    return request<void>(`/api/v1/reward-rules/${id}`, {
      method: 'DELETE',
    });
  },

  async reorderRules(body: ReorderRewardRulesRequest): Promise<RewardRule[]> {
    return request<RewardRule[]>('/api/v1/reward-rules/reorder', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async listMilestones(accountId: string): Promise<RewardMilestone[]> {
    return request<RewardMilestone[]>(`/api/v1/reward-milestones?accountId=${accountId}`);
  },

  async createMilestone(body: RewardMilestoneRequest): Promise<RewardMilestone> {
    return request<RewardMilestone>('/api/v1/reward-milestones', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updateMilestone(id: string, body: RewardMilestoneRequest): Promise<RewardMilestone> {
    return request<RewardMilestone>(`/api/v1/reward-milestones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async deleteMilestone(id: string): Promise<void> {
    return request<void>(`/api/v1/reward-milestones/${id}`, {
      method: 'DELETE',
    });
  },

  async listCapBuckets(accountId: string): Promise<RewardCapBucket[]> {
    return request<RewardCapBucket[]>(`/api/v1/reward-cap-buckets?accountId=${accountId}`);
  },

  async createCapBucket(body: RewardCapBucketRequest): Promise<RewardCapBucket> {
    return request<RewardCapBucket>('/api/v1/reward-cap-buckets', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updateCapBucket(id: string, body: RewardCapBucketRequest): Promise<RewardCapBucket> {
    return request<RewardCapBucket>(`/api/v1/reward-cap-buckets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async deleteCapBucket(id: string): Promise<void> {
    return request<void>(`/api/v1/reward-cap-buckets/${id}`, {
      method: 'DELETE',
    });
  },

  async getAccountConfig(accountId: string): Promise<RewardAccountConfig> {
    return request<RewardAccountConfig>(`/api/v1/reward-config?accountId=${accountId}`);
  },

  async updateAccountConfig(body: RewardAccountConfigRequest): Promise<RewardAccountConfig> {
    return request<RewardAccountConfig>('/api/v1/reward-config', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async report(params: { accountId: string; from: string; to: string }): Promise<RewardReport> {
    const query = new URLSearchParams({
      accountId: params.accountId,
      from: params.from,
      to: params.to,
    });
    return request<RewardReport>(`/api/v1/rewards/report?${query}`);
  },

  async lines(params: {
    accountId: string;
    from: string;
    to: string;
    ruleId?: string;
    page?: number;
    size?: number;
  }): Promise<PagedRewardLines> {
    const query = new URLSearchParams({
      accountId: params.accountId,
      from: params.from,
      to: params.to,
    });
    if (params.ruleId) query.set('ruleId', params.ruleId);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    return request<PagedRewardLines>(`/api/v1/rewards/lines?${query}`);
  },

  async recommend(body: RewardRecommendationRequest): Promise<RewardRecommendationResponse> {
    return request<RewardRecommendationResponse>('/api/v1/reward-recommendations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

// LLM API Keys API
export const llmKeysApi = {
  async list(): Promise<LlmKeyDto[]> {
    return request<LlmKeyDto[]>('/api/v1/llm-keys');
  },

  async create(data: CreateLlmKeyRequest): Promise<LlmKeyDto> {
    return request<LlmKeyDto>('/api/v1/llm-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/llm-keys/${id}`, {
      method: 'DELETE',
    });
  },

  async updatePosition(id: string, position: number): Promise<LlmKeyDto[]> {
    return request<LlmKeyDto[]>(`/api/v1/llm-keys/${id}/position`, {
      method: 'PATCH',
      body: JSON.stringify({ position }),
    });
  },

  async test(id: string, model?: string): Promise<TestKeyResponse> {
    return request<TestKeyResponse>(`/api/v1/llm-keys/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    });
  },
};

// LLM Routing API
export const llmRoutingApi = {
  async getTaskGroups(): Promise<LlmTaskGroupDto[]> {
    return request<LlmTaskGroupDto[]>('/api/v1/llm/task-groups');
  },

  async getCatalog(): Promise<ProviderCatalogDto[]> {
    return request<ProviderCatalogDto[]>('/api/v1/llm/catalog');
  },

  async getRoutingOptions(): Promise<RoutingOptionDto[]> {
    return request<RoutingOptionDto[]>('/api/v1/llm/routing-options');
  },

  async getRouting(): Promise<LlmRoutingDto> {
    return request<LlmRoutingDto>('/api/v1/llm/routing');
  },

  async updateRouting(group: string, data: UpdateRoutingRequest): Promise<LlmRoutingGroupDto> {
    return request<LlmRoutingGroupDto>(`/api/v1/llm/routing/${group}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async resetRouting(group: string): Promise<LlmRoutingGroupDto> {
    return request<LlmRoutingGroupDto>(`/api/v1/llm/routing/${group}/reset`, {
      method: 'POST',
    });
  },

  async getHealth(): Promise<LlmBucketHealthDto[]> {
    return request<LlmBucketHealthDto[]>('/api/v1/llm/health');
  },
};

export { ApiError };



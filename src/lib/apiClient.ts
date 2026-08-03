import { cookies } from 'next/headers';

import { Account, AccountRequest } from '@/lib/account.types';
import { CategorizeResponse, Category, CategoryRequest } from '@/lib/categories.types';
import type {
  CreateDashboardRequest,
  DashboardResponse,
  UpdateDashboardRequest,
} from '@/lib/dashboards.types';
import type {
  CreateReportRequest,
  DatasourceCatalog,
  ReportData,
  ReportResponse,
  ReportRunOptions,
  ReportSummaryResponse,
  ReportType,
  RunReportRequest,
  UpdateReportRequest,
} from '@/lib/reports.types';
import type { CategoryRule, CreateRuleRequest, PagedRules,UpdateRuleRequest } from '@/lib/rules.types';
import { BatchDeleteRequest, BatchDeleteResponse, BatchReviewRequest, BatchReviewResponse, CreateTransactionLinkRequest, PagedTransaction, Transaction, TransactionLinkResponse, TransactionRequest, TransactionSearchRequest } from '@/lib/transaction.types';

import type {
  CorporateAction,
  CreateCorporateActionRequest,
  CreateDividendRequest,
  CreateInstrumentRequest,
  CreateInvestmentTransactionRequest,
  CreateSipRequest,
  DashboardSummary,
  Dividend,
  ErrorResponse,
  FileIngestionResult,
  GmailConnectionResponse,
  GmailOAuthStartResponse,
  GmailSenderRequest,
  GmailSenderResponse,
  GoogleAuthStartResponse,
  ImportCommitRequest,
  ImportCommitResult,
  ImportPreview,
  ReconcileCommitRequest,
  ReconcilePreview,
  Instrument,
  InstrumentCandidate,
  InstrumentType,
  InvestmentPositionResponse,
  InvestmentSummary,
  InvestmentTransactionResponse,
  LoginRequest,
  PagedDividendResponse,
  PagedInvestmentTransactionResponse,
  PriceHistoryPoint,
  PriceRefreshResult,
  ResolveInstrumentRequest,
  SetPriceRequest,
  SignupRequest,
  Sip,
  SyncSummary,
  UpdateCorporateActionRequest,
  UpdateDividendRequest,
  UpdateInvestmentTransactionRequest,
  UpdateSipRequest,
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

  const headers: HeadersInit = {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  Object.assign(headers, options.headers);

  if (sessionCookie) {
    (headers as Record<string, string>)['Cookie'] =
      `FINANCEOS_SESSION=${sessionCookie}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store',
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
};

// Accounts API
export const accountsApi = {
  async list(): Promise<Account[]> {
    return request<Account[]>('/api/v1/accounts');
  },

  async getById(id: string): Promise<Account> {
    return request<Account>(`/api/v1/accounts/${id}`);
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

  async getCardCycleSummary(id: string): Promise<import('@/lib/statement.types').CardCycleSummary> {
    return request<import('@/lib/statement.types').CardCycleSummary>(`/api/v1/accounts/${id}/card-summary`);
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
  async list(
    page = 0,
    size = 50,
    sort = 'date,desc',
  ): Promise<PagedTransaction> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort,
    });
    return request<PagedTransaction>(`/api/v1/transactions?${params}`);
  },

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
};

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

  async refreshPrices(instrumentId?: string): Promise<PriceRefreshResult> {
    const query = instrumentId ? `?instrumentId=${encodeURIComponent(instrumentId)}` : '';
    return request<PriceRefreshResult>(`/api/v1/investments/prices/refresh${query}`, {
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
    page?: number;
    size?: number;
  }): Promise<PagedDividendResponse> {
    const params = new URLSearchParams({
      page: String(filters?.page ?? 0),
      size: String(filters?.size ?? 100),
    });
    if (filters?.holdingId) params.set('holdingId', filters.holdingId);
    if (filters?.brokerAccountId) params.set('brokerAccountId', filters.brokerAccountId);
    if (filters?.instrumentId) params.set('instrumentId', filters.instrumentId);
    return request<PagedDividendResponse>(`/api/v1/investments/dividends?${params}`);
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

// Corporate Actions API
export const corporateActionsApi = {
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

  async commit(data: ImportCommitRequest): Promise<ImportCommitResult> {
    return request<ImportCommitResult>('/api/v1/investments/imports/commit', {
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

  async commitReconcile(data: ReconcileCommitRequest): Promise<ImportCommitResult> {
    return request<ImportCommitResult>('/api/v1/investments/imports/reconcile/commit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// SIPs API (Phase 5)
export const sipsApi = {
  async list(): Promise<Sip[]> {
    // Server returns all SIPs as a plain array (unpaged).
    return request<Sip[]>('/api/v1/investments/sips');
  },

  async get(id: string): Promise<Sip> {
    return request<Sip>(`/api/v1/investments/sips/${id}`);
  },

  async create(data: CreateSipRequest): Promise<Sip> {
    return request<Sip>('/api/v1/investments/sips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateSipRequest): Promise<Sip> {
    return request<Sip>(`/api/v1/investments/sips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/investments/sips/${id}`, {
      method: 'DELETE',
    });
  },
};

// Gmail API
export const gmailApi = {
  async startOAuth(): Promise<GmailOAuthStartResponse> {
    return request<GmailOAuthStartResponse>('/api/v1/gmail/oauth/start');
  },

  async sync(): Promise<SyncSummary> {
    return request<SyncSummary>('/api/v1/gmail/sync', {
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
};

export const categoriesApi = {
  async list(): Promise<Category[]> {
    return request<Category[]>('/api/v1/categories');
  },

  async getById(id: string): Promise<Category> {
    return request<Category>(`/api/v1/categories/${id}`);
  },

  async create(data: CategoryRequest): Promise<Category> {
    return request<Category>('/api/v1/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: CategoryRequest): Promise<Category> {
    return request<Category>(`/api/v1/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return request<void>(`/api/v1/categories/${id}`, {
      method: 'DELETE',
    });
  },

  async categorizeDescription(description: string): Promise<CategorizeResponse> {
    return request<CategorizeResponse>('/api/v1/categorize', {
      method: 'POST',
      body: JSON.stringify({ description }),
    });
  },
};

// Dashboard API
export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/api/v1/dashboard/summary');
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
  async getDatasource(): Promise<DatasourceCatalog> {
    return request<DatasourceCatalog>('/api/v1/report/datasource');
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

  // Get the current user's default dashboard (no id). Throws ApiError with
  // status 404 when no default is set — callers should handle that gracefully.
  async getDefault(): Promise<DashboardResponse> {
    return request<DashboardResponse>('/api/v1/dashboards/default');
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
  async ingest(accountId: string, formData: FormData): Promise<FileIngestionResult> {
    return request<FileIngestionResult>(`/api/v1/accounts/${accountId}/ingest`, {
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
};

// Transaction Links API
export const transactionLinksApi = {
  async create(data: CreateTransactionLinkRequest): Promise<TransactionLinkResponse> {
    return request<TransactionLinkResponse>('/api/v1/transaction-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getById(id: string): Promise<TransactionLinkResponse> {
    return request<TransactionLinkResponse>(`/api/v1/transaction-links/${id}`);
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

export { ApiError };

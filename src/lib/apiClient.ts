import { cookies } from 'next/headers';

import { Account, AccountRequest } from '@/lib/account.types';
import { Category, CategoryRequest } from '@/lib/categories.types';
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
import { PagedTransaction, ReviewType,Transaction, TransactionRequest, TransactionSearchRequest } from '@/lib/transaction.types';

import type {
  CreateInvestmentTransactionRequest,
  DashboardSummary,
  ErrorResponse,
  FileIngestionResult,
  GmailConnectionResponse,
  GmailOAuthStartResponse,
  GmailSenderRequest,
  GmailSenderResponse,
  GoogleAuthStartResponse,
  InvestmentPositionResponse,
  InvestmentTransactionResponse,
  LoginRequest,
  PagedInvestmentTransactionResponse,
  SignupRequest,
  SyncSummary,
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

  async batchReview(data: { transactionIds: string[]; reviewType: ReviewType }): Promise<{ updated: number }> {
    return request<{ updated: number }>('/api/v1/transactions/batch-review', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async batchDelete(data: { transactionIds: string[] }): Promise<{ deleted: number }> {
    return request<{ deleted: number }>('/api/v1/transactions/batch-delete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Investments API
export const investmentsApi = {
  async listTransactions(
    page = 0,
    size = 50,
  ): Promise<PagedInvestmentTransactionResponse> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
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

  async getPositions(): Promise<InvestmentPositionResponse> {
    return request<InvestmentPositionResponse>('/api/v1/investments/position');
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

  async categorizeDescription(description: string): Promise<Category[]> {
    return request<Category[]>('/api/v1/categorize', {
      method: 'POST',
      body: JSON.stringify(description),
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
// A dashboard arranges report widgets on a 12-column grid. It stores no query
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

export { ApiError };

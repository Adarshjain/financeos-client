import { cookies } from 'next/headers';

import type {
  AccountResponse,
  BankDetailsRequest,
  CreateAccountRequest,
  CreateInvestmentTransactionRequest,
  CreateTransactionRequest,
  CreditCardDetailsRequest,
  DashboardSummary,
  ErrorResponse,
  GmailFetchRequest,
  GmailFetchResult,
  GmailOAuthStartResponse,
  GoogleAuthStartResponse,
  InvestmentPositionResponse,
  InvestmentTransactionResponse,
  LoginRequest,
  MutualFundDetailsRequest,
  PagedInvestmentTransactionResponse,
  PagedTransactionResponse,
  SignupRequest,
  StockDetailsRequest,
  TransactionResponse,
  UserResponse,
} from './types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';

class ApiError extends Error {
  constructor(
    public status: number,
    public response: ErrorResponse
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
  options: RequestInit = {}
): Promise<T> {
  const sessionCookie = await getSessionCookie();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

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
    data: LoginRequest
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
      }
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
  async list(): Promise<AccountResponse[]> {
    return request<AccountResponse[]>('/api/v1/accounts');
  },

  async getById(id: string): Promise<AccountResponse> {
    return request<AccountResponse>(`/api/v1/accounts/${id}`);
  },

  async create(data: CreateAccountRequest): Promise<AccountResponse> {
    return request<AccountResponse>('/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addBankDetails(
    id: string,
    data: BankDetailsRequest
  ): Promise<AccountResponse> {
    return request<AccountResponse>(`/api/v1/accounts/${id}/bank-details`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addCreditCardDetails(
    id: string,
    data: CreditCardDetailsRequest
  ): Promise<AccountResponse> {
    return request<AccountResponse>(
      `/api/v1/accounts/${id}/credit-card-details`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async addStockDetails(
    id: string,
    data: StockDetailsRequest
  ): Promise<AccountResponse> {
    return request<AccountResponse>(`/api/v1/accounts/${id}/stock-details`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addMutualFundDetails(
    id: string,
    data: MutualFundDetailsRequest
  ): Promise<AccountResponse> {
    return request<AccountResponse>(
      `/api/v1/accounts/${id}/mutual-fund-details`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },
};

// Transactions API
export const transactionsApi = {
  async list(
    page = 0,
    size = 50,
    sort = 'date,desc'
  ): Promise<PagedTransactionResponse> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort,
    });
    return request<PagedTransactionResponse>(`/api/v1/transactions?${params}`);
  },

  async create(data: CreateTransactionRequest): Promise<TransactionResponse> {
    return request<TransactionResponse>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Investments API
export const investmentsApi = {
  async listTransactions(
    page = 0,
    size = 50
  ): Promise<PagedInvestmentTransactionResponse> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    return request<PagedInvestmentTransactionResponse>(
      `/api/v1/investments/transactions?${params}`
    );
  },

  async createTransaction(
    data: CreateInvestmentTransactionRequest
  ): Promise<InvestmentTransactionResponse> {
    return request<InvestmentTransactionResponse>(
      '/api/v1/investments/transactions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
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

  async sync(data?: GmailFetchRequest): Promise<GmailFetchResult> {
    return request<GmailFetchResult>('/api/v1/gmail/sync', {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};

// Dashboard API
export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/api/v1/dashboard/summary');
  },
};

export { ApiError };

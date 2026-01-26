import { cookies } from 'next/headers';

import { Account, AccountRequest } from '@/lib/account.types';
import { Category, CategoryRequest } from '@/lib/categories.types';
import { PagedTransaction, Transaction, TransactionRequest } from '@/lib/transaction.types';

import type {
  CreateInvestmentTransactionRequest,
  DashboardSummary,
  ErrorResponse,
  GmailFetchRequest,
  GmailFetchResult,
  GmailOAuthStartResponse,
  GoogleAuthStartResponse,
  InvestmentPositionResponse,
  InvestmentTransactionResponse,
  LoginRequest,
  PagedInvestmentTransactionResponse,
  SignupRequest,
  UserResponse,
} from './types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';

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

  async sync(data?: GmailFetchRequest): Promise<GmailFetchResult> {
    return request<GmailFetchResult>('/api/v1/gmail/sync', {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};

export const categoriesApi = {
  async list(): Promise<Category[]> {
    return [
      { "id": "cat-001", "name": "Technology" },
      { "id": "cat-002", "name": "Finance" },
      { "id": "cat-003", "name": "Health & Wellness" },
      { "id": "cat-004", "name": "Education" },
      { "id": "cat-005", "name": "Travel" },
      { "id": "cat-006", "name": "Food & Cooking" },
      { "id": "cat-007", "name": "Sports" },
      { "id": "cat-008", "name": "Entertainment" },
      { "id": "cat-009", "name": "Movies" },
      { "id": "cat-010", "name": "Music" },
      { "id": "cat-011", "name": "Books" },
      { "id": "cat-012", "name": "Gaming" },
      { "id": "cat-013", "name": "Fashion" },
      { "id": "cat-014", "name": "Lifestyle" },
      { "id": "cat-015", "name": "Fitness" },
      { "id": "cat-016", "name": "Mental Health" },
      { "id": "cat-017", "name": "Productivity" },
      { "id": "cat-018", "name": "Startups" },
      { "id": "cat-019", "name": "Business" },
      { "id": "cat-020", "name": "Marketing" },
      { "id": "cat-021", "name": "Design" },
      { "id": "cat-022", "name": "UI/UX" },
      { "id": "cat-023", "name": "Programming" },
      { "id": "cat-024", "name": "Web Development" },
      { "id": "cat-025", "name": "Mobile Apps" },
      { "id": "cat-026", "name": "Artificial Intelligence" },
      { "id": "cat-027", "name": "Machine Learning" },
      { "id": "cat-028", "name": "Data Science" },
      { "id": "cat-029", "name": "Cloud Computing" },
      { "id": "cat-030", "name": "Cyber Security" },
      { "id": "cat-031", "name": "DevOps" },
      { "id": "cat-032", "name": "Open Source" },
      { "id": "cat-033", "name": "Hardware" },
      { "id": "cat-034", "name": "Gadgets" },
      { "id": "cat-035", "name": "E-commerce" },
      { "id": "cat-036", "name": "Real Estate" },
      { "id": "cat-037", "name": "Investing" },
      { "id": "cat-038", "name": "Personal Finance" },
      { "id": "cat-039", "name": "Cryptocurrency" },
      { "id": "cat-040", "name": "Blockchain" },
      { "id": "cat-041", "name": "Politics" },
      { "id": "cat-042", "name": "World News" },
      { "id": "cat-043", "name": "Science" },
      { "id": "cat-044", "name": "Environment" },
      { "id": "cat-045", "name": "Space" },
      { "id": "cat-046", "name": "Automobiles" },
      { "id": "cat-047", "name": "Startups India" },
      { "id": "cat-048", "name": "Career" },
      { "id": "cat-049", "name": "Remote Work" },
      { "id": "cat-050", "name": "Side Projects" }
    ]
    // return request<Category[]>('/api/v1/categories');
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
};

// Dashboard API
export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/api/v1/dashboard/summary');
  },
};

export { ApiError };

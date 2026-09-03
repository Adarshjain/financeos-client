import { cookies, headers as nextHeaders } from 'next/headers';

import type {
  Account,
  AccountRequest,
  Cardholder,
  CloseAccountRequest,
  CloseCardholderRequest,
  CloseCardRequest,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';
import { ApiError } from '@/lib/api/client';
import { serverApi } from '@/lib/api/server';
import type { ErrorResponse, Schemas } from '@/lib/api/types';
import type { CategorizeResponse, Category, CategoryRequest } from '@/lib/categories.types';
import type {
  CreateDashboardRequest,
  DashboardResponse,
  UpdateDashboardRequest,
} from '@/lib/dashboards.types';
import type { EnqueueResponse, JobResponse, PagedJobResponse } from '@/lib/jobs.types';
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
  UpdateLlmKeyPositionRequest,
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
import { Page } from '@/lib/pagination';
import type {
  CreateReportRequest,
  ReportCatalog,
  ReportData,
  ReportDefinition,
  ReportResponse,
  ReportRunOptions,
  ReportSummaryResponse,
  ReportType,
  RunReportRequest,
  UpdateReportRequest,
} from '@/lib/reports.types';
import type {
  PagedRewardLines,
  ReorderRewardRulesRequest,
  RewardAccountConfig,
  RewardAccountConfigRequest,
  RewardCapBucket,
  RewardCapBucketRequest,
  RewardMilestone,
  RewardMilestoneRequest,
  RewardRecommendationRequest,
  RewardRecommendationResponse,
  RewardReport,
  RewardRule,
  RewardRuleRequest,
} from '@/lib/rewards.types';
import type {
  ApplyRuleRequest,
  CategoryRule,
  CreateRuleRequest,
  PagedRuleMatches,
  PagedRules,
  PreviewMatchesRequest,
  UpdateRuleRequest,
} from '@/lib/rules.types';
import type { CardCycleSummary, StatementDetail, StatementSummary } from '@/lib/statement.types';
import type {
  BatchDeleteRequest,
  BatchDeleteResponse,
  BatchReviewRequest,
  BatchReviewResponse,
  BulkReattributeCardRequest,
  BulkReattributeResponse,
  CreateTransactionLinkRequest,
  MergeTransactionsRequest,
  MergeTransactionsResponse,
  PagedTransaction,
  Transaction,
  TransactionLinkResponse,
  TransactionRequest,
  TransactionSearchRequest,
} from '@/lib/transaction.types';
import type {
  AcceptSuggestionsRequest,
  AcceptSuggestionsResponse,
  CorporateAction,
  CreateCorporateActionRequest,
  CreateDividendRequest,
  CreateFnoTradeRequest,
  CreateInstrumentRequest,
  CreateInvestmentTransactionRequest,
  Dividend,
  DividendSuggestionsResponse,
  DividendSummary,
  DividendType,
  FnoTradeListResponse,
  FnoTradeResponse,
  GmailCleanupPreview,
  GmailCleanupResult,
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
  PagedDividendResponse,
  PagedGmailAttention,
  PagedInvestmentTransactionResponse,
  PriceHistoryPoint,
  ReconcileCommitRequest,
  ReconcilePreview,
  ResolveInstrumentRequest,
  SetPriceRequest,
  UpdateCorporateActionRequest,
  UpdateDividendRequest,
  UpdateFnoTradeRequest,
  UpdateInvestmentTransactionRequest,
  UserResponse,
} from '@/lib/types';

export { ApiError };

const API_BASE = process.env.API_BASE_URL || 'http://localhost:6969';

// ---------------------------------------------------------------------------
// Raw-fetch helpers — for the handful of flows serverApi's typed client can't
// (or shouldn't) cover:
//   - signup/login/OAuth-callback need the raw Set-Cookie header, which
//     openapi-fetch's response wrapper doesn't expose.
//   - multipart file uploads (ingest, import preview/reconcile-preview): the
//     generated schema types their multipart requestBody as e.g.
//     `{ file: string }` (binary format collapses to `string`), which a real
//     `FormData` can never satisfy structurally. Plain `fetch` has no such
//     constraint, and the middleware's own FormData handling is exactly this
//     pattern already.
// ---------------------------------------------------------------------------

async function parseError(response: Response): Promise<ApiError> {
  const err: ErrorResponse = await response.json().catch(() => ({
    code: 'UNKNOWN_ERROR',
    message: `Request failed with status ${response.status}`,
    timestamp: new Date().toISOString(),
  }));
  return new ApiError(response.status, err);
}

function extractSessionCookie(response: Response): string | undefined {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return undefined;
  const match = setCookie.match(/FINANCEOS_SESSION=([^;]+)/);
  return match ? match[1] : undefined;
}

/** Un-authenticated POST that also returns the session cookie from `Set-Cookie`. */
async function authPost<T>(endpoint: string, body: unknown): Promise<{ data: T; sessionCookie?: string }> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) throw await parseError(response);
  const data: T = await response.json();
  return { data, sessionCookie: extractSessionCookie(response) };
}

/** Un-authenticated GET that also returns the session cookie from `Set-Cookie`. */
async function authGet<T>(endpoint: string, query?: Record<string, string | undefined>): Promise<{ data: T; sessionCookie?: string }> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined) params.set(k, v);
  }
  const qs = params.toString() ? `?${params}` : '';
  const response = await fetch(`${API_BASE}${endpoint}${qs}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw await parseError(response);
  const data: T = await response.json();
  return { data, sessionCookie: extractSessionCookie(response) };
}

/** Authenticated (session-cookie-forwarding) multipart POST — mirrors serverMiddleware's own header logic. */
async function authenticatedFormPost<T>(
  path: string,
  query: Record<string, string | number | boolean | string[] | undefined>,
  formData: FormData,
): Promise<T> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) params.append(k, item);
    } else {
      params.set(k, String(v));
    }
  }
  const qs = params.toString() ? `?${params}` : '';

  const reqHeaders: Record<string, string> = {};
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('FINANCEOS_SESSION')?.value;
    if (sessionCookie) reqHeaders.Cookie = `FINANCEOS_SESSION=${sessionCookie}`;
  } catch {
    // Outside request context
  }
  try {
    const headerStore = await nextHeaders();
    const requestId = headerStore.get('x-request-id');
    const sessionId = headerStore.get('x-session-id');
    if (requestId) reqHeaders['X-Request-Id'] = requestId;
    if (sessionId) reqHeaders['X-Session-Id'] = sessionId;
  } catch {
    // Outside request context
  }

  const response = await fetch(`${API_BASE}${path}${qs}`, {
    method: 'POST',
    headers: reqHeaders,
    body: formData,
    cache: 'no-store',
  });
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  signup: async (body: { email: string; password: string; inviteCode: string }): Promise<UserResponse> => {
    const { data } = await serverApi.POST('/api/v1/auth/signup', { body });
    return data! as UserResponse;
  },
  login: async (body: { email: string; password: string }): Promise<{ user: UserResponse; sessionCookie?: string }> => {
    const { data, sessionCookie } = await authPost<UserResponse>('/api/v1/auth/login', body);
    return { user: data, sessionCookie };
  },
  googleStart: async (): Promise<GoogleAuthStartResponse> => {
    const { data } = await serverApi.GET('/api/v1/auth/google/start');
    return data! as GoogleAuthStartResponse;
  },
  startGoogleAuth: async (): Promise<GoogleAuthStartResponse> => authApi.googleStart(),
  me: async (): Promise<UserResponse> => {
    const { data } = await serverApi.GET('/api/v1/auth/me');
    return data! as UserResponse;
  },
  getCurrentUser: async (): Promise<UserResponse> => authApi.me(),
  logout: async (): Promise<void> => {
    await serverApi.POST('/api/v1/auth/logout');
  },
  handleGoogleCallback: async (params: { code?: string; state?: string; error?: string }): Promise<{ user: UserResponse; sessionCookie?: string }> => {
    const { data, sessionCookie } = await authGet<UserResponse>('/api/v1/auth/google/callback', params);
    return { user: data, sessionCookie };
  },
  deleteAccount: async (body: { password?: string; confirmEmail?: string }): Promise<void> => {
    await serverApi.POST('/api/v1/auth/me/delete', { body });
  },
  getDeletionSummary: async (): Promise<{ counts: Record<string, number>; total: number }> => {
    const { data } = await serverApi.GET('/api/v1/auth/me/deletion-summary');
    return data! as { counts: Record<string, number>; total: number };
  },
};

// ---------------------------------------------------------------------------
// Accounts & Cardholders
// ---------------------------------------------------------------------------

export const accountsApi = {
  list: async (): Promise<Account[]> => {
    const { data } = await serverApi.GET('/api/v1/accounts');
    return ((data as Account[]) || []);
  },
  get: async (id: string): Promise<Account> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{id}', { params: { path: { id } } });
    return data! as Account;
  },
  create: async (body: AccountRequest): Promise<Account> => {
    const { data } = await serverApi.POST('/api/v1/accounts', { body: body as Schemas['BankAccountRequest'] });
    return data! as Account;
  },
  update: async (id: string, body: AccountRequest): Promise<Account> => {
    const { data } = await serverApi.PUT('/api/v1/accounts/{id}', {
      params: { path: { id } },
      body: body as Schemas['BankAccountRequest'],
    });
    return data! as Account;
  },
  delete: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/accounts/{id}', { params: { path: { id } } });
  },
  getCardCycleSummary: async (id: string): Promise<CardCycleSummary | null> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{id}/card-summary', { params: { path: { id } } });
    return (data as CardCycleSummary) ?? null;
  },
  close: async (id: string, body?: CloseAccountRequest): Promise<Account> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{id}/close', { params: { path: { id } }, body });
    return data! as Account;
  },
  reopen: async (id: string): Promise<Account> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{id}/reopen', { params: { path: { id } } });
    return data! as Account;
  },
  gmailCleanupPreview: async (id: string, before: string): Promise<GmailCleanupPreview> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{id}/gmail-cleanup-preview', {
      params: { path: { id }, query: { before } },
    });
    return data! as GmailCleanupPreview;
  },
  gmailCleanup: async (id: string, before: string): Promise<GmailCleanupResult> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{id}/gmail-cleanup', {
      params: { path: { id }, query: { before } },
    });
    return data! as GmailCleanupResult;
  },
};

export const cardholdersApi = {
  list: async (accountId: string): Promise<Cardholder[]> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{accountId}/cardholders', { params: { path: { accountId } } });
    return (data as Cardholder[]) || [];
  },
  listByAccount: async (accountId: string): Promise<Cardholder[]> => cardholdersApi.list(accountId),
  create: async (accountId: string, body: CreateCardholderRequest): Promise<Cardholder> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders', {
      params: { path: { accountId } },
      body: body as Schemas['CreateCardholderRequest'],
    });
    return data! as Cardholder;
  },
  addPrimary: async (accountId: string, body: CreateCardRequest): Promise<Cardholder> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/primary', {
      params: { path: { accountId } },
      body: body as Schemas['CreateCardRequest'],
    });
    return data! as Cardholder;
  },
  addAddon: async (accountId: string, body: CreateCardholderRequest): Promise<Cardholder> => cardholdersApi.create(accountId, body),
  update: async (accountId: string, cardholderId: string, body: UpdateCardholderRequest): Promise<Cardholder> => {
    const { data } = await serverApi.PUT('/api/v1/accounts/{accountId}/cardholders/{cardholderId}', {
      params: { path: { accountId, cardholderId } },
      body: body as Schemas['UpdateCardholderRequest'],
    });
    return data! as Cardholder;
  },
  delete: async (accountId: string, cardholderId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/accounts/{accountId}/cardholders/{cardholderId}', { params: { path: { accountId, cardholderId } } });
  },
  close: async (accountId: string, cardholderId: string, body?: CloseCardholderRequest): Promise<Cardholder> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/close', {
      params: { path: { accountId, cardholderId } },
      body,
    });
    return data! as Cardholder;
  },
  reopen: async (accountId: string, cardholderId: string): Promise<Cardholder> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/reopen', {
      params: { path: { accountId, cardholderId } },
    });
    return data! as Cardholder;
  },
  createCard: async (accountId: string, cardholderId: string, body: CreateCardRequest): Promise<Cardholder> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards', {
      params: { path: { accountId, cardholderId } },
      body: body as Schemas['CreateCardRequest'],
    });
    return data! as Cardholder;
  },
  addCard: async (accountId: string, cardholderId: string, body: CreateCardRequest): Promise<Cardholder> =>
    cardholdersApi.createCard(accountId, cardholderId, body),
  replaceCard: async (accountId: string, cardholderId: string, cardId: string, body: ReplaceCardRequest): Promise<Cardholder> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/replace', {
      params: { path: { accountId, cardholderId, cardId } },
      body,
    });
    return data! as Cardholder;
  },
  /**
   * Back-compat alias for callers that only track a card id, not its
   * cardholder — every card still has exactly one cardholder line, so the
   * card id doubles as the cardholder id here (mirrors the pre-split model).
   */
  replace: async (accountId: string, cardId: string, body: ReplaceCardRequest): Promise<Cardholder> =>
    cardholdersApi.replaceCard(accountId, cardId, cardId, body),
  closeCard: async (accountId: string, cardholderId: string, cardId: string, body?: CloseCardRequest): Promise<Cardholder> => {
    const { data } = await serverApi.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/close', {
      params: { path: { accountId, cardholderId, cardId } },
      body,
    });
    return data! as Cardholder;
  },
  /**
   * No real per-card DELETE endpoint exists on the server (only close/replace
   * do) — see Server follow-ups. Closing is the closest real lifecycle
   * operation and, unlike the previous implementation's DELETE call against a
   * URL that happened to collide with `deleteCardholder`, does not risk
   * deleting the whole cardholder line by accident.
   */
  deleteCard: async (accountId: string, cardholderId: string, cardId: string): Promise<void> => {
    await cardholdersApi.closeCard(accountId, cardholderId, cardId);
  },
};

/** Backwards-compatible alias — the original exported both names. */
export const accountCardsApi = cardholdersApi;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    const { data } = await serverApi.GET('/api/v1/categories');
    return (data as Category[]) || [];
  },
  create: async (body: CategoryRequest): Promise<Category> => {
    const { data } = await serverApi.POST('/api/v1/categories', { body });
    return data! as Category;
  },
  update: async (id: string, body: CategoryRequest): Promise<Category> => {
    const { data } = await serverApi.PUT('/api/v1/categories/{id}', { params: { path: { id } }, body });
    return data! as Category;
  },
  delete: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/categories/{id}', { params: { path: { id } } });
  },
  categorize: async (body: { description: string; amount?: number }): Promise<CategorizeResponse> => {
    const { data } = await serverApi.POST('/api/v1/categorize', { body: { description: body.description } });
    return data! as CategorizeResponse;
  },
  categorizeDescription: async (description: string): Promise<CategorizeResponse> => categoriesApi.categorize({ description }),
};

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export const dashboardsApi = {
  list: async (): Promise<DashboardResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/dashboards');
    return (data as DashboardResponse[]) || [];
  },
  get: async (id: string): Promise<DashboardResponse> => {
    const { data } = await serverApi.GET('/api/v1/dashboards/{id}', { params: { path: { id } } });
    return data! as DashboardResponse;
  },
  getById: async (id: string): Promise<DashboardResponse> => dashboardsApi.get(id),
  create: async (body: CreateDashboardRequest): Promise<DashboardResponse> => {
    const { data } = await serverApi.POST('/api/v1/dashboards', { body });
    return data! as DashboardResponse;
  },
  update: async (id: string, body: UpdateDashboardRequest): Promise<DashboardResponse> => {
    const { data } = await serverApi.PUT('/api/v1/dashboards/{id}', { params: { path: { id } }, body });
    return data! as DashboardResponse;
  },
  delete: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/dashboards/{id}', { params: { path: { id } } });
  },
};

// ---------------------------------------------------------------------------
// Investments
// ---------------------------------------------------------------------------

export const investmentsApi = {
  getSummary: async (): Promise<InvestmentSummary> => {
    const { data } = await serverApi.GET('/api/v1/investments/summary');
    return data! as InvestmentSummary;
  },
  getPositions: async (): Promise<InvestmentPositionResponse> => {
    const { data } = await serverApi.GET('/api/v1/investments/positions');
    return data! as InvestmentPositionResponse;
  },
  getTrades: async (params?: { page?: number; size?: number; sort?: string; brokerAccountId?: string; instrumentId?: string }): Promise<PagedInvestmentTransactionResponse> => {
    const { data } = await serverApi.GET('/api/v1/investments/transactions', {
      params: {
        query: {
          brokerAccountId: params?.brokerAccountId,
          instrumentId: params?.instrumentId,
          page: params?.page ?? 0, size: params?.size ?? 50, sort: params?.sort ? [params.sort] : [],
        },
      },
    });
    return data! as PagedInvestmentTransactionResponse;
  },
  createTrade: async (body: CreateInvestmentTransactionRequest): Promise<InvestmentTransactionResponse> => {
    const { data } = await serverApi.POST('/api/v1/investments/transactions', { body: body as Schemas['CreateInvestmentTransactionRequest'] });
    return data! as InvestmentTransactionResponse;
  },
  updateTrade: async (id: string, body: UpdateInvestmentTransactionRequest): Promise<InvestmentTransactionResponse> => {
    const { data } = await serverApi.PUT('/api/v1/investments/transactions/{id}', {
      params: { path: { id } },
      body: body as Schemas['UpdateInvestmentTransactionRequest'],
    });
    return data! as InvestmentTransactionResponse;
  },
  deleteTrade: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/investments/transactions/{id}', { params: { path: { id } } });
  },
  getFnoTrades: async (params?: { page?: number; size?: number; brokerAccountId?: string; symbol?: string; from?: string; to?: string }): Promise<FnoTradeListResponse> => {
    const { data } = await serverApi.GET('/api/v1/investments/fno');
    return data! as FnoTradeListResponse;
  },
  createFnoTrade: async (body: CreateFnoTradeRequest): Promise<FnoTradeResponse> => {
    const { data } = await serverApi.POST('/api/v1/investments/fno', { body: body as Schemas['CreateFnoTradeRequest'] });
    return data! as FnoTradeResponse;
  },
  updateFnoTrade: async (id: string, body: UpdateFnoTradeRequest): Promise<FnoTradeResponse> => {
    const { data } = await serverApi.PUT('/api/v1/investments/fno/{id}', {
      params: { path: { id } },
      body: body as Schemas['CreateFnoTradeRequest'],
    });
    return data! as FnoTradeResponse;
  },
  deleteFnoTrade: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/investments/fno/{id}', { params: { path: { id } } });
  },
  getDividends: async (params?: { page?: number; size?: number; sort?: string; brokerAccountId?: string; instrumentId?: string; year?: number }): Promise<PagedDividendResponse> => {
    const { data } = await serverApi.GET('/api/v1/investments/dividends', {
      params: {
        query: {
          brokerAccountId: params?.brokerAccountId,
          instrumentId: params?.instrumentId,
          page: params?.page ?? 0, size: params?.size ?? 50, sort: params?.sort ? [params.sort] : [],
        },
      },
    });
    return data! as PagedDividendResponse;
  },
  createDividend: async (body: CreateDividendRequest): Promise<Dividend> => {
    const { data } = await serverApi.POST('/api/v1/investments/dividends', { body: body as Schemas['CreateDividendRequest'] });
    return data! as Dividend;
  },
  updateDividend: async (id: string, body: UpdateDividendRequest): Promise<Dividend> => {
    const { data } = await serverApi.PUT('/api/v1/investments/dividends/{id}', {
      params: { path: { id } },
      body: body as Schemas['UpdateDividendRequest'],
    });
    return data! as Dividend;
  },
  deleteDividend: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/investments/dividends/{id}', { params: { path: { id } } });
  },
  getDividendSuggestions: async (brokerAccountId?: string): Promise<DividendSuggestionsResponse> => {
    const { data } = await serverApi.GET('/api/v1/investments/dividends/suggestions', { params: { query: { brokerAccountId } } });
    return data! as DividendSuggestionsResponse;
  },
  acceptDividendSuggestions: async (body: AcceptSuggestionsRequest): Promise<AcceptSuggestionsResponse> => {
    const { data } = await serverApi.POST('/api/v1/investments/dividends/suggestions/accept', { body: body as Schemas['AcceptSuggestionsRequest'] });
    return data! as AcceptSuggestionsResponse;
  },
  getCorporateActions: async (instrumentId?: string): Promise<CorporateAction[]> => {
    if (instrumentId) {
      const { data } = await serverApi.GET('/api/v1/instruments/{instrumentId}/corporate-actions', { params: { path: { instrumentId } } });
      return (data as CorporateAction[]) || [];
    }
    const { data } = await serverApi.GET('/api/v1/corporate-actions');
    return (data as CorporateAction[]) || [];
  },
  createCorporateAction: async (instrumentId: string, body: CreateCorporateActionRequest): Promise<CorporateAction> => {
    const { data } = await serverApi.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId } },
      body: body as Schemas['CreateCorporateActionRequest'],
    });
    return data! as CorporateAction;
  },
  updateCorporateAction: async (instrumentId: string, id: string, body: UpdateCorporateActionRequest): Promise<CorporateAction> => {
    const { data } = await serverApi.PUT('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId, id } },
      body: body as Schemas['UpdateCorporateActionRequest'],
    });
    return data! as CorporateAction;
  },
  deleteCorporateAction: async (instrumentId: string, id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', { params: { path: { instrumentId, id } } });
  },
  getInstruments: async (params?: { query?: string; type?: InstrumentType; limit?: number }): Promise<Instrument[]> => {
    const { data } = await serverApi.GET('/api/v1/instruments', {
      params: { query: { search: params?.query, type: params?.type } },
    });
    return (data as Instrument[]) || [];
  },
  getInstrument: async (id: string): Promise<Instrument> => {
    const { data } = await serverApi.GET('/api/v1/instruments/{id}', { params: { path: { id } } });
    return data! as Instrument;
  },
  createInstrument: async (body: CreateInstrumentRequest): Promise<Instrument> => {
    const { data } = await serverApi.POST('/api/v1/instruments', { body: body as Schemas['InstrumentRequest'] });
    return data! as Instrument;
  },
  setInstrumentPrice: async (id: string, body: SetPriceRequest): Promise<void> => {
    await serverApi.POST('/api/v1/instruments/{id}/price', {
      params: { path: { id } },
      body: body as Schemas['UpsertPriceRequest'],
    });
  },
  refreshPrices: async (instrumentId?: string): Promise<EnqueueResponse> => {
    const { data } = await serverApi.POST('/api/v1/investments/prices/refresh', { params: { query: { instrumentId } } });
    return data! as EnqueueResponse;
  },
  getImportPreview: async (_type: string, formData: FormData): Promise<ImportPreview> => {
    const source = String(formData.get('source') ?? _type);
    const brokerAccountId = String(formData.get('brokerAccountId') ?? '');
    const password = formData.get('password');
    return authenticatedFormPost<ImportPreview>('/api/v1/investments/imports/preview', {
      source,
      brokerAccountId,
      password: password ? String(password) : undefined,
    }, formData);
  },
  commitImport: async (body: ImportCommitRequest): Promise<ImportCommitResult> => {
    const { data } = await serverApi.POST('/api/v1/investments/imports/commit', { body: body as Schemas['ImportCommitRequest'] });
    return data! as ImportCommitResult;
  },
  getReconcilePreview: async (brokerAccountId: string, formData: FormData): Promise<ReconcilePreview> => {
    const broker = String(formData.get('broker') ?? '');
    const assetScope = formData.get('assetScope');
    return authenticatedFormPost<ReconcilePreview>('/api/v1/investments/imports/reconcile/preview', {
      broker,
      brokerAccountId,
      assetScope: assetScope ? String(assetScope) : undefined,
    }, formData);
  },
  commitReconcile: async (body: ReconcileCommitRequest): Promise<ImportCommitResult> => {
    const { data } = await serverApi.POST('/api/v1/investments/imports/reconcile/commit', { body: body as Schemas['ReconcileCommitRequest'] });
    return data! as ImportCommitResult;
  },
  search: async (q?: string): Promise<Instrument[]> => investmentsApi.getInstruments({ query: q }),
  listTransactions: async (page = 0, size = 50, filters?: { brokerAccountId?: string; instrumentId?: string; holdingId?: string; search?: string }): Promise<PagedInvestmentTransactionResponse> =>
    investmentsApi.getTrades({ page, size, brokerAccountId: filters?.brokerAccountId, instrumentId: filters?.instrumentId }),
  createTransaction: async (body: CreateInvestmentTransactionRequest): Promise<InvestmentTransactionResponse> => investmentsApi.createTrade(body),
  updateTransaction: async (id: string, body: UpdateInvestmentTransactionRequest): Promise<InvestmentTransactionResponse> => investmentsApi.updateTrade(id, body),
  deleteTransaction: async (id: string): Promise<void> => investmentsApi.deleteTrade(id),
};

export const instrumentsApi = {
  search: async (q?: string): Promise<Instrument[]> => investmentsApi.search(q),
  catalogSearch: async (query: string, type?: InstrumentType): Promise<InstrumentCandidate[]> => {
    const { data } = await serverApi.GET('/api/v1/instruments/catalog-search', { params: { query: { q: query, type } } });
    return (data as InstrumentCandidate[]) || [];
  },
  resolveInstrument: async (req: ResolveInstrumentRequest): Promise<Instrument> => {
    const { data } = await serverApi.POST('/api/v1/instruments/resolve', { body: req as Schemas['ResolveInstrumentRequest'] });
    return data! as Instrument;
  },
  create: async (body: CreateInstrumentRequest): Promise<Instrument> => investmentsApi.createInstrument(body),
  update: async (id: string, body: CreateInstrumentRequest): Promise<Instrument> => {
    const { data } = await serverApi.PUT('/api/v1/instruments/{id}', {
      params: { path: { id } },
      body: body as Schemas['InstrumentRequest'],
    });
    return data! as Instrument;
  },
  setPrice: async (id: string, body: SetPriceRequest): Promise<void> => investmentsApi.setInstrumentPrice(id, body),
  getPriceHistory: async (id: string): Promise<PriceHistoryPoint[]> => {
    const { data } = await serverApi.GET('/api/v1/instruments/{id}/prices', { params: { path: { id } } });
    return (data as PriceHistoryPoint[]) || [];
  },
  updatePrice: async (instrumentId: string, priceId: string, body: { price: number | string }): Promise<void> => {
    await serverApi.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId, priceId } },
      body: { price: Number(body.price) },
    });
  },
  deletePrice: async (instrumentId: string, priceId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/instruments/{instrumentId}/prices/{priceId}', { params: { path: { instrumentId, priceId } } });
  },
};

export const corporateActionsApi = {
  listAll: async (): Promise<CorporateAction[]> => investmentsApi.getCorporateActions(),
  listByInstrument: async (instrumentId: string): Promise<CorporateAction[]> => investmentsApi.getCorporateActions(instrumentId),
  list: async (instrumentId: string): Promise<CorporateAction[]> => investmentsApi.getCorporateActions(instrumentId),
  create: async (instrumentId: string, data: CreateCorporateActionRequest): Promise<CorporateAction> =>
    investmentsApi.createCorporateAction(instrumentId, data),
  update: async (instrumentId: string, id: string, data: UpdateCorporateActionRequest): Promise<CorporateAction> =>
    investmentsApi.updateCorporateAction(instrumentId, id, data),
  delete: async (instrumentId: string, id: string): Promise<void> => investmentsApi.deleteCorporateAction(instrumentId, id),
};

export const dividendsApi = {
  list: async (params: { page?: number; size?: number; brokerAccountId?: string; instrumentId?: string; year?: number }): Promise<PagedDividendResponse> =>
    investmentsApi.getDividends(params),
  summary: async (filters?: { holdingId?: string; brokerAccountId?: string; instrumentId?: string; type?: DividendType }): Promise<DividendSummary> => {
    const { data } = await serverApi.GET('/api/v1/investments/dividends/summary', {
      params: { query: { holdingId: filters?.holdingId, brokerAccountId: filters?.brokerAccountId, instrumentId: filters?.instrumentId, type: filters?.type } },
    });
    return data! as DividendSummary;
  },
  create: async (data: CreateDividendRequest): Promise<Dividend> => investmentsApi.createDividend(data),
  update: async (id: string, data: UpdateDividendRequest): Promise<Dividend> => investmentsApi.updateDividend(id, data),
  delete: async (id: string): Promise<void> => investmentsApi.deleteDividend(id),
  suggestions: async (brokerAccountId?: string): Promise<DividendSuggestionsResponse> => investmentsApi.getDividendSuggestions(brokerAccountId),
  acceptSuggestions: async (body: AcceptSuggestionsRequest): Promise<AcceptSuggestionsResponse> => investmentsApi.acceptDividendSuggestions(body),
};

export const fnoApi = {
  listTrades: async (params: { page?: number; size?: number; brokerAccountId?: string; symbol?: string; from?: string; to?: string } | undefined): Promise<FnoTradeListResponse> =>
    investmentsApi.getFnoTrades(params),
  createTrade: async (data: CreateFnoTradeRequest): Promise<FnoTradeResponse> => investmentsApi.createFnoTrade(data),
  updateTrade: async (id: string, data: UpdateFnoTradeRequest): Promise<FnoTradeResponse> => investmentsApi.updateFnoTrade(id, data),
  deleteTrade: async (id: string): Promise<void> => investmentsApi.deleteFnoTrade(id),
};

export const importsApi = {
  preview: async (formData: FormData): Promise<ImportPreview> => investmentsApi.getImportPreview('', formData),
  commit: async (body: ImportCommitRequest): Promise<ImportCommitResult> => investmentsApi.commitImport(body),
  previewReconcile: async (formData: FormData): Promise<ReconcilePreview> => {
    const brokerAccountId = String(formData.get('brokerAccountId') ?? '');
    return investmentsApi.getReconcilePreview(brokerAccountId, formData);
  },
  commitReconcile: async (body: ReconcileCommitRequest): Promise<ImportCommitResult> => investmentsApi.commitReconcile(body),
};

// ---------------------------------------------------------------------------
// Counterparties / Lendings / Obligations (folded from the WIP `lendingApi`)
// ---------------------------------------------------------------------------

export const counterpartiesApi = {
  list: async (page = 0, size = 50): Promise<Page<CounterpartyResponse>> => {
    const { data } = await serverApi.GET('/api/v1/counterparties', {
      params: { query: { page, size, sort: [] } },
    });
    return data! as Page<CounterpartyResponse>;
  },
  create: async (body: CreateCounterpartyRequest): Promise<CounterpartyResponse> => {
    const { data } = await serverApi.POST('/api/v1/counterparties', { body });
    return data! as CounterpartyResponse;
  },
  update: async (id: string, body: UpdateCounterpartyRequest): Promise<CounterpartyResponse> => {
    const { data } = await serverApi.PUT('/api/v1/counterparties/{id}', { params: { path: { id } }, body });
    return data! as CounterpartyResponse;
  },
  remove: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/counterparties/{id}', { params: { path: { id } } });
  },
};

export const lendingsApi = {
  list: async (counterpartyId?: string, page = 0, size = 50): Promise<Page<LendingResponse>> => {
    const { data } = await serverApi.GET('/api/v1/lendings', {
      params: { query: { counterpartyId, page, size, sort: [] } },
    });
    return data! as Page<LendingResponse>;
  },
  getDetail: async (id: string): Promise<LendingResponse> => {
    const { data } = await serverApi.GET('/api/v1/lendings/{id}', { params: { path: { id } } });
    return data! as LendingResponse;
  },
  create: async (body: CreateLendingRequest): Promise<LendingResponse> => {
    const { data } = await serverApi.POST('/api/v1/lendings', { body });
    return data! as LendingResponse;
  },
  update: async (id: string, body: UpdateLendingRequest): Promise<LendingResponse> => {
    const { data } = await serverApi.PUT('/api/v1/lendings/{id}', { params: { path: { id } }, body });
    return data! as LendingResponse;
  },
  remove: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/lendings/{id}', { params: { path: { id } } });
  },
};

export const obligationsApi = {
  getUpcoming: async (months?: number): Promise<ObligationsResponse> => {
    const { data } = await serverApi.GET('/api/v1/obligations/upcoming', { params: { query: { months } } });
    return data! as ObligationsResponse;
  },
};

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

export const loansApi = {
  list: async (status?: LoanStatus, page = 0, size = 50): Promise<Page<LoanResponse>> => {
    const { data } = await serverApi.GET('/api/v1/loans', {
      params: { query: { status, page, size } },
    });
    return data! as Page<LoanResponse>;
  },
  get: async (id: string): Promise<LoanDetailResponse> => {
    const { data } = await serverApi.GET('/api/v1/loans/{id}', { params: { path: { id } } });
    return data! as LoanDetailResponse;
  },
  getDetail: async (id: string): Promise<LoanDetailResponse> => loansApi.get(id),
  create: async (body: CreateLoanRequest): Promise<LoanResponse> => {
    const { data } = await serverApi.POST('/api/v1/loans', { body });
    return data! as LoanResponse;
  },
  update: async (id: string, body: UpdateLoanRequest): Promise<LoanResponse> => {
    const { data } = await serverApi.PUT('/api/v1/loans/{id}', { params: { path: { id } }, body });
    return data! as LoanResponse;
  },
  delete: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/loans/{id}', { params: { path: { id } } });
  },
  remove: async (id: string): Promise<void> => loansApi.delete(id),
  close: async (id: string): Promise<void> => {
    await serverApi.POST('/api/v1/loans/{id}/close', { params: { path: { id } } });
  },
  reopen: async (id: string): Promise<void> => {
    await serverApi.POST('/api/v1/loans/{id}/reopen', { params: { path: { id } } });
  },
  createPayment: async (loanId: string, body: CreateLoanPaymentRequest): Promise<LoanPaymentResponse> => {
    const { data } = await serverApi.POST('/api/v1/loans/{id}/payments', { params: { path: { id: loanId } }, body });
    return data! as LoanPaymentResponse;
  },
  addPayment: async (loanId: string, body: CreateLoanPaymentRequest): Promise<LoanPaymentResponse> => loansApi.createPayment(loanId, body),
  deletePayment: async (loanId: string, paymentId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/loans/{id}/payments/{paymentId}', { params: { path: { id: loanId, paymentId } } });
  },
  createEvent: async (loanId: string, body: CreateLoanEventRequest): Promise<LoanEventResponse> => {
    const { data } = await serverApi.POST('/api/v1/loans/{id}/events', { params: { path: { id: loanId } }, body });
    return data! as LoanEventResponse;
  },
  addEvent: async (loanId: string, body: CreateLoanEventRequest): Promise<LoanEventResponse> => loansApi.createEvent(loanId, body),
  deleteEvent: async (loanId: string, eventId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/loans/{id}/events/{eventId}', { params: { path: { id: loanId, eventId } } });
  },
  createCharge: async (loanId: string, body: CreateLoanChargeRequest): Promise<LoanChargeResponse> => {
    const { data } = await serverApi.POST('/api/v1/loans/{id}/charges', { params: { path: { id: loanId } }, body });
    return data! as LoanChargeResponse;
  },
  addCharge: async (loanId: string, body: CreateLoanChargeRequest): Promise<LoanChargeResponse> => loansApi.createCharge(loanId, body),
  deleteCharge: async (loanId: string, chargeId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/loans/{id}/charges/{chargeId}', { params: { path: { id: loanId, chargeId } } });
  },
  getSummary: async (): Promise<LoansSummaryResponse> => {
    const { data } = await serverApi.GET('/api/v1/loans/summary');
    return data! as LoansSummaryResponse;
  },
  getSchedule: async (id: string): Promise<InstallmentDto[]> => {
    const { data } = await serverApi.GET('/api/v1/loans/{id}/schedule', { params: { path: { id } } });
    // Documented as a map keyed by an internal grouping; in practice a flat list.
    // Object.values(...).flat() is correct either way — a no-op on a flat array.
    return Object.values((data ?? {}) as Record<string, InstallmentDto[]>).flat();
  },
  getMatchSuggestions: async (id: string): Promise<MatchSuggestionsResponse> => {
    const { data } = await serverApi.GET('/api/v1/loans/{id}/match-suggestions', { params: { path: { id } } });
    return data! as MatchSuggestionsResponse;
  },
  batchPayments: async (id: string, body: BatchLoanPaymentRequest): Promise<void> => {
    await serverApi.POST('/api/v1/loans/{id}/payments/batch', {
      params: { path: { id } },
      body: body as Schemas['BatchLoanPaymentRequest'],
    });
  },
  addPaymentsBatch: async (id: string, body: BatchLoanPaymentRequest): Promise<{ created: number }> => {
    await loansApi.batchPayments(id, body);
    return { created: body.items.length };
  },
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/**
 * The server types report payloads as an open JSON object (a Java interface with per-type records),
 * so the wire shape is narrowed here once, at the boundary, into the client's discriminated union.
 */
function asReportData(raw: unknown): ReportData {
  return raw as ReportData;
}

export const reportsApi = {
  list: async (type?: ReportType): Promise<ReportSummaryResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/reports', { params: { query: { type } } });
    return (data as ReportSummaryResponse[]) || [];
  },
  getById: async (id: string): Promise<ReportResponse> => {
    const { data } = await serverApi.GET('/api/v1/reports/{id}', { params: { path: { id } } });
    const raw = data!;
    const definition: unknown = raw.definition;
    return { ...raw, definition: definition as ReportDefinition };
  },
  get: async (id: string): Promise<ReportResponse> => reportsApi.getById(id),
  create: async (body: CreateReportRequest): Promise<ReportResponse> => {
    const { data } = await serverApi.POST('/api/v1/reports', {
      body: { ...body, description: body.description ?? undefined, definition: { ...body.definition } },
    });
    const raw = data!;
    const definition: unknown = raw.definition;
    return { ...raw, definition: definition as ReportDefinition };
  },
  update: async (id: string, body: UpdateReportRequest): Promise<ReportResponse> => {
    const { data } = await serverApi.PUT('/api/v1/reports/{id}', {
      params: { path: { id } },
      body: { ...body, description: body.description ?? undefined, definition: { ...body.definition } },
    });
    const raw = data!;
    const definition: unknown = raw.definition;
    return { ...raw, definition: definition as ReportDefinition };
  },
  delete: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/reports/{id}', { params: { path: { id } } });
  },
  getDatasource: async (): Promise<ReportCatalog> => {
    const { data } = await serverApi.GET('/api/v1/report/datasource');
    return data! as ReportCatalog;
  },
  getCatalog: async (): Promise<ReportCatalog> => reportsApi.getDatasource(),
  runSaved: async (id: string, options?: ReportRunOptions): Promise<ReportData> => {
    const { data } = await serverApi.POST('/api/v1/reports/{id}/data', {
      params: { path: { id }, query: { page: options?.page, size: options?.size } },
    });
    return asReportData(data);
  },
  run: async (id: string, options?: ReportRunOptions): Promise<ReportData> => reportsApi.runSaved(id, options),
  runAdHoc: async (request: RunReportRequest, options?: ReportRunOptions): Promise<ReportData> => {
    const { data } = await serverApi.POST('/api/v1/reports/data', {
      params: { query: { page: options?.page, size: options?.size } },
      body: { ...request, definition: { ...request.definition } },
    });
    return asReportData(data);
  },
};

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export const rewardsApi = {
  listRules: async (accountId: string): Promise<RewardRule[]> => {
    const { data } = await serverApi.GET('/api/v1/reward-rules', { params: { query: { accountId } } });
    return (data as RewardRule[]) || [];
  },
  getRule: async (ruleId: string): Promise<RewardRule | undefined> =>
    (await rewardsApi.listRules('')).find((r) => r.id === ruleId),
  createRule: async (body: RewardRuleRequest): Promise<RewardRule> => {
    const { data } = await serverApi.POST('/api/v1/reward-rules', { body: body as Schemas['RewardRuleRequest'] });
    return data! as RewardRule;
  },
  updateRule: async (ruleId: string, body: RewardRuleRequest): Promise<RewardRule> => {
    const { data } = await serverApi.PUT('/api/v1/reward-rules/{id}', {
      params: { path: { id: ruleId } },
      body: body as Schemas['RewardRuleRequest'],
    });
    return data! as RewardRule;
  },
  deleteRule: async (ruleId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/reward-rules/{id}', { params: { path: { id: ruleId } } });
  },
  reorderRules: async (body: ReorderRewardRulesRequest): Promise<RewardRule[]> => {
    const { data } = await serverApi.POST('/api/v1/reward-rules/reorder', { body });
    return (data as RewardRule[]) || [];
  },
  getConfig: async (accountId: string): Promise<RewardAccountConfig> => {
    const { data } = await serverApi.GET('/api/v1/reward-config', { params: { query: { accountId } } });
    return data! as RewardAccountConfig;
  },
  getAccountConfig: async (accountId: string): Promise<RewardAccountConfig> => rewardsApi.getConfig(accountId),
  updateConfig: async (accountId: string, body: RewardAccountConfigRequest): Promise<RewardAccountConfig> => {
    const { data } = await serverApi.PUT('/api/v1/reward-config', {
      body: { ...body, accountId } as Schemas['RewardAccountConfigRequest'],
    });
    return data! as RewardAccountConfig;
  },
  updateAccountConfig: async (body: RewardAccountConfigRequest): Promise<RewardAccountConfig> => rewardsApi.updateConfig(body.accountId, body),
  listBuckets: async (accountId: string): Promise<RewardCapBucket[]> => {
    const { data } = await serverApi.GET('/api/v1/reward-cap-buckets', { params: { query: { accountId } } });
    return (data as RewardCapBucket[]) || [];
  },
  listCapBuckets: async (accountId: string): Promise<RewardCapBucket[]> => rewardsApi.listBuckets(accountId),
  createBucket: async (body: RewardCapBucketRequest): Promise<RewardCapBucket> => {
    const { data } = await serverApi.POST('/api/v1/reward-cap-buckets', { body: body as Schemas['RewardCapBucketRequest'] });
    return data! as RewardCapBucket;
  },
  createCapBucket: async (body: RewardCapBucketRequest): Promise<RewardCapBucket> => rewardsApi.createBucket(body),
  updateBucket: async (bucketId: string, body: RewardCapBucketRequest): Promise<RewardCapBucket> => {
    const { data } = await serverApi.PUT('/api/v1/reward-cap-buckets/{id}', {
      params: { path: { id: bucketId } },
      body: body as Schemas['RewardCapBucketRequest'],
    });
    return data! as RewardCapBucket;
  },
  updateCapBucket: async (id: string, body: RewardCapBucketRequest): Promise<RewardCapBucket> => rewardsApi.updateBucket(id, body),
  deleteBucket: async (bucketId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/reward-cap-buckets/{id}', { params: { path: { id: bucketId } } });
  },
  deleteCapBucket: async (id: string): Promise<void> => rewardsApi.deleteBucket(id),
  listMilestones: async (accountId: string): Promise<RewardMilestone[]> => {
    const { data } = await serverApi.GET('/api/v1/reward-milestones', { params: { query: { accountId } } });
    return (data as RewardMilestone[]) || [];
  },
  createMilestone: async (body: RewardMilestoneRequest): Promise<RewardMilestone> => {
    const { data } = await serverApi.POST('/api/v1/reward-milestones', { body: body as Schemas['RewardMilestoneRequest'] });
    return data! as RewardMilestone;
  },
  updateMilestone: async (milestoneId: string, body: RewardMilestoneRequest): Promise<RewardMilestone> => {
    const { data } = await serverApi.PUT('/api/v1/reward-milestones/{id}', {
      params: { path: { id: milestoneId } },
      body: body as Schemas['RewardMilestoneRequest'],
    });
    return data! as RewardMilestone;
  },
  deleteMilestone: async (milestoneId: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/reward-milestones/{id}', { params: { path: { id: milestoneId } } });
  },
  getReport: async (accountId: string, from = '', to = ''): Promise<RewardReport> => {
    const { data } = await serverApi.GET('/api/v1/rewards/report', { params: { query: { accountId, from, to } } });
    return data! as RewardReport;
  },
  report: async (params: { accountId: string; from: string; to: string }): Promise<RewardReport> => rewardsApi.getReport(params.accountId, params.from, params.to),
  getRecommendations: async (body: RewardRecommendationRequest): Promise<RewardRecommendationResponse> => {
    const { data } = await serverApi.POST('/api/v1/reward-recommendations', { body: body as Schemas['RewardRecommendationRequest'] });
    return data! as RewardRecommendationResponse;
  },
  recommend: async (body: RewardRecommendationRequest): Promise<RewardRecommendationResponse> => rewardsApi.getRecommendations(body),
  getRewardLines: async (params: { accountId: string; page?: number; size?: number; from?: string; to?: string; ruleId?: string }): Promise<PagedRewardLines> => {
    const { data } = await serverApi.GET('/api/v1/rewards/lines', {
      params: {
        query: {
          accountId: params.accountId,
          from: params.from ?? '',
          to: params.to ?? '',
          ruleId: params.ruleId,
          page: params.page ?? 0, size: params.size ?? 50, sort: [],
        },
      },
    });
    return data! as PagedRewardLines;
  },
  lines: async (params: { accountId: string; page?: number; size?: number; from?: string; to?: string; ruleId?: string }): Promise<PagedRewardLines> => rewardsApi.getRewardLines(params),
};

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export const rulesApi = {
  list: async (params?: { page?: number; size?: number; sort?: string; search?: string; verified?: boolean }): Promise<PagedRules> => {
    const { data } = await serverApi.GET('/api/v1/rules', {
      params: {
        query: {
          verified: params?.verified,
          search: params?.search,
          page: params?.page ?? 0, size: params?.size ?? 20, sort: params?.sort ? [params.sort] : [],
        },
      },
    });
    return data! as PagedRules;
  },
  create: async (body: CreateRuleRequest): Promise<CategoryRule> => {
    const { data } = await serverApi.POST('/api/v1/rules', { body: body as Schemas['CreateRuleRequest'] });
    return data! as CategoryRule;
  },
  update: async (id: string, body: UpdateRuleRequest): Promise<CategoryRule> => {
    const { data } = await serverApi.PUT('/api/v1/rules/{id}', {
      params: { path: { id } },
      body: body as Schemas['UpdateRuleRequest'],
    });
    return data! as CategoryRule;
  },
  delete: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/rules/{id}', { params: { path: { id } } });
  },
  /** Alias for delete — matches the original surface. */
  remove: async (id: string): Promise<void> => rulesApi.delete(id),
  verify: async (id: string): Promise<CategoryRule> => {
    const { data } = await serverApi.POST('/api/v1/rules/{id}/verify', { params: { path: { id } } });
    return data! as CategoryRule;
  },
  apply: async (id: string, body?: ApplyRuleRequest): Promise<EnqueueResponse> => {
    const { data } = await serverApi.POST('/api/v1/rules/{id}/apply', {
      params: { path: { id } },
      body: body ?? {},
    });
    return data! as EnqueueResponse;
  },
  previewMatches: async (body: PreviewMatchesRequest, params?: { page?: number; size?: number }): Promise<PagedRuleMatches> => {
    const { data } = await serverApi.POST('/api/v1/rules/preview-matches', {
      params: { query: { page: params?.page ?? 0, size: params?.size ?? 20, sort: [] } },
      body,
    });
    return data! as PagedRuleMatches;
  },
};

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

export const statementsApi = {
  listByAccount: async (accountId: string): Promise<StatementSummary[]> => {
    const { data } = await serverApi.GET('/api/v1/accounts/{accountId}/statements', { params: { path: { accountId } } });
    return (data as StatementSummary[]) || [];
  },
  getById: async (statementId: string): Promise<StatementDetail> => {
    const { data } = await serverApi.GET('/api/v1/statements/{statementId}', { params: { path: { statementId } } });
    return data! as StatementDetail;
  },
};

// ---------------------------------------------------------------------------
// Transactions & links
// ---------------------------------------------------------------------------

export const transactionsApi = {
  search: async (request: TransactionSearchRequest, queryParams?: { page?: number; size?: number; sort?: string[] }): Promise<PagedTransaction> => {
    const { data } = await serverApi.POST('/api/v1/transactions/search', {
      body: request as Schemas['TransactionSearchRequest'],
      params: { query: queryParams },
    });
    return data! as PagedTransaction;
  },
  create: async (body: TransactionRequest): Promise<Transaction> => {
    const { data } = await serverApi.POST('/api/v1/transactions', { body: body as Schemas['CreateTransactionRequest'] });
    return data! as Transaction;
  },
  update: async (id: string, body: TransactionRequest): Promise<Transaction> => {
    const { data } = await serverApi.PUT('/api/v1/transactions/{id}', {
      params: { path: { id } },
      body: body as Schemas['UpdateTransactionRequest'],
    });
    return data! as Transaction;
  },
  delete: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/transactions/{id}', { params: { path: { id } } });
  },
  batchDelete: async (body: BatchDeleteRequest): Promise<BatchDeleteResponse> => {
    const { data } = await serverApi.POST('/api/v1/transactions/batch-delete', { body });
    return data! as BatchDeleteResponse;
  },
  batchReview: async (body: BatchReviewRequest): Promise<BatchReviewResponse> => {
    const { data } = await serverApi.POST('/api/v1/transactions/batch-review', { body: body as Schemas['BatchReviewRequest'] });
    return data! as BatchReviewResponse;
  },
  merge: async (body: MergeTransactionsRequest): Promise<MergeTransactionsResponse> => {
    const { data } = await serverApi.POST('/api/v1/transactions/merge', { body });
    return data! as MergeTransactionsResponse;
  },
  bulkReattributeCard: async (body: BulkReattributeCardRequest): Promise<BulkReattributeResponse> => {
    const { data } = await serverApi.PATCH('/api/v1/transactions/card', { body: body as Schemas['BulkReattributeCardRequest'] });
    return data! as BulkReattributeResponse;
  },
};

export const transactionLinksApi = {
  create: async (body: CreateTransactionLinkRequest): Promise<TransactionLinkResponse> => {
    const { data } = await serverApi.POST('/api/v1/transaction-links', { body: body as Schemas['CreateTransactionLinkRequest'] });
    return data! as TransactionLinkResponse;
  },
  delete: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/transaction-links/{id}', { params: { path: { id } } });
  },
  getByTransactionId: async (transactionId: string): Promise<TransactionLinkResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/transaction-links', { params: { query: { transactionId } } });
    return (data as TransactionLinkResponse[]) || [];
  },
};

// ---------------------------------------------------------------------------
// Ingestion & Jobs — two distinct resources (file ingest vs. the job queue)
// ---------------------------------------------------------------------------

export const ingestionApi = {
  ingest: async (accountId: string, formData: FormData): Promise<EnqueueResponse> => {
    const files = formData.getAll('files').filter((f): f is File => f instanceof File);
    const names = files.length > 0 ? files.map((f) => f.name) : [''];
    return authenticatedFormPost<EnqueueResponse>(`/api/v1/accounts/${accountId}/ingest`, { files: names }, formData);
  },
};

export const jobsApi = {
  list: async (params?: { type?: string; status?: string; page?: number; size?: number }): Promise<PagedJobResponse> => {
    const { data } = await serverApi.GET('/api/v1/jobs', {
      params: {
        query: {
          type: params?.type,
          status: params?.status,
          page: params?.page,
          size: params?.size,
          sort: ['createdAt,desc'],
        },
      },
    });
    return data! as PagedJobResponse;
  },
  get: async (id: string): Promise<JobResponse> => {
    const { data } = await serverApi.GET('/api/v1/jobs/{id}', { params: { path: { id } } });
    return data! as JobResponse;
  },
  cancel: async (id: string): Promise<JobResponse> => {
    const { data } = await serverApi.POST('/api/v1/jobs/{id}/cancel', { params: { path: { id } } });
    return data! as JobResponse;
  },
  retry: async (id: string): Promise<JobResponse> => {
    const { data } = await serverApi.POST('/api/v1/jobs/{id}/retry', { params: { path: { id } } });
    return data! as JobResponse;
  },
};

// ---------------------------------------------------------------------------
// Gmail
// ---------------------------------------------------------------------------

export const gmailApi = {
  startOAuth: async (): Promise<GmailOAuthStartResponse> => {
    const { data } = await serverApi.GET('/api/v1/gmail/oauth/start');
    return data! as GmailOAuthStartResponse;
  },
  sync: async (): Promise<EnqueueResponse> => {
    const { data } = await serverApi.POST('/api/v1/gmail/sync');
    return data! as EnqueueResponse;
  },
  listSenders: async (): Promise<GmailSenderResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/gmail/senders');
    return (data as GmailSenderResponse[]) || [];
  },
  createSender: async (body: GmailSenderRequest): Promise<GmailSenderResponse> => {
    const { data } = await serverApi.POST('/api/v1/gmail/senders', { body });
    return data! as GmailSenderResponse;
  },
  updateSender: async (id: string, body: GmailSenderRequest): Promise<GmailSenderResponse> => {
    const { data } = await serverApi.PUT('/api/v1/gmail/senders/{id}', { params: { path: { id } }, body });
    return data! as GmailSenderResponse;
  },
  deleteSender: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/gmail/senders/{id}', { params: { path: { id } } });
  },
  listConnections: async (): Promise<GmailConnectionResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/gmail/connections');
    return (data as GmailConnectionResponse[]) || [];
  },
  disconnectConnection: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/gmail/connections/{id}', { params: { path: { id } } });
  },
  getAttentionItems: async (page = 0, size = 20, includeRetryable = false): Promise<PagedGmailAttention> => {
    const { data } = await serverApi.GET('/api/v1/gmail/attention', { params: { query: { page, size, includeRetryable } } });
    return data! as PagedGmailAttention;
  },
  retryAttentionItem: async (ledgerId: string): Promise<EnqueueResponse> => {
    const { data } = await serverApi.POST('/api/v1/gmail/attention/{ledgerId}/retry', { params: { path: { ledgerId } } });
    return data! as EnqueueResponse;
  },
  rescan: async (fromDate: string): Promise<EnqueueResponse> => {
    const { data } = await serverApi.POST('/api/v1/gmail/rescan', { body: { fromDate } });
    return data! as EnqueueResponse;
  },
};

// ---------------------------------------------------------------------------
// LLM keys & routing (folded from the WIP `llmApi`)
// ---------------------------------------------------------------------------

export const llmKeysApi = {
  list: async (): Promise<LlmKeyDto[]> => {
    const { data } = await serverApi.GET('/api/v1/llm-keys');
    return (data as LlmKeyDto[]) || [];
  },
  create: async (body: CreateLlmKeyRequest): Promise<LlmKeyDto> => {
    const { data } = await serverApi.POST('/api/v1/llm-keys', { body: body as Schemas['CreateLlmKeyRequest'] });
    return data! as LlmKeyDto;
  },
  updatePosition: async (id: string, position: number | UpdateLlmKeyPositionRequest): Promise<void> => {
    const body = typeof position === 'number' ? { position } : position;
    await serverApi.PATCH('/api/v1/llm-keys/{id}/position', { params: { path: { id } }, body });
  },
  delete: async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/llm-keys/{id}', { params: { path: { id } } });
  },
  test: async (id: string, model?: string): Promise<TestKeyResponse> => {
    const { data } = await serverApi.POST('/api/v1/llm-keys/{id}/test', { params: { path: { id } }, body: { model } });
    return data! as TestKeyResponse;
  },
};

export const llmRoutingApi = {
  getTaskGroups: async (): Promise<LlmTaskGroupDto[]> => {
    const { data } = await serverApi.GET('/api/v1/llm/task-groups');
    return (data as LlmTaskGroupDto[]) || [];
  },
  getCatalog: async (): Promise<ProviderCatalogDto[]> => {
    const { data } = await serverApi.GET('/api/v1/llm/catalog');
    return (data as ProviderCatalogDto[]) || [];
  },
  getRoutingOptions: async (): Promise<RoutingOptionDto[]> => {
    const { data } = await serverApi.GET('/api/v1/llm/routing-options');
    return (data as RoutingOptionDto[]) || [];
  },
  getRouting: async (): Promise<LlmRoutingDto> => {
    const { data } = await serverApi.GET('/api/v1/llm/routing');
    return data! as LlmRoutingDto;
  },
  updateRouting: async (group: string, body: UpdateRoutingRequest): Promise<LlmRoutingGroupDto> => {
    const { data } = await serverApi.PUT('/api/v1/llm/routing/{group}', { params: { path: { group } }, body });
    return data! as LlmRoutingGroupDto;
  },
  resetRouting: async (group: string): Promise<LlmRoutingGroupDto> => {
    const { data } = await serverApi.POST('/api/v1/llm/routing/{group}/reset', { params: { path: { group } } });
    return data! as LlmRoutingGroupDto;
  },
  getHealth: async (): Promise<LlmBucketHealthDto[]> => {
    const { data } = await serverApi.GET('/api/v1/llm/health');
    return (data as LlmBucketHealthDto[]) || [];
  },
};

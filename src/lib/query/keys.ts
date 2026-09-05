import type { LoanStatus } from '@/lib/loan.types';
import type { InstrumentType } from '@/lib/types';

export const keys = {
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...keys.transactions.all, 'list'] as const,
    search: (params: Record<string, unknown> = {}) => [...keys.transactions.lists(), params] as const,
    reviewCount: () => [...keys.transactions.all, 'reviewCount'] as const,
    cardOptions: () => [...keys.transactions.all, 'cardOptions'] as const,
    byId: (id: string) => [...keys.transactions.all, 'detail', id] as const,
    links: (transactionId: string) => [...keys.transactions.all, 'links', transactionId] as const,
  },

  accounts: {
    all: ['accounts'] as const,
    list: () => [...keys.accounts.all, 'list'] as const,
    byId: (id: string) => [...keys.accounts.all, 'detail', id] as const,
    cycleSummary: (id: string) => [...keys.accounts.all, 'cycleSummary', id] as const,
    cardholders: (accountId: string) => [...keys.accounts.all, 'cardholders', accountId] as const,
    identifiers: (accountId: string) => [...keys.accounts.all, 'identifiers', accountId] as const,
  },

  categories: {
    all: ['categories'] as const,
    list: () => [...keys.categories.all, 'list'] as const,
  },

  dashboards: {
    all: ['dashboards'] as const,
    list: () => [...keys.dashboards.all, 'list'] as const,
    byId: (id: string) => [...keys.dashboards.all, 'detail', id] as const,
    summary: () => [...keys.dashboards.all, 'summary'] as const,
    widget: (id: string, params: Record<string, unknown> = {}) =>
      [...keys.dashboards.all, 'widget', id, params] as const,
  },

  jobs: {
    all: ['jobs'] as const,
    list: (params: Record<string, unknown> = {}) => [...keys.jobs.all, 'list', params] as const,
    byId: (id: string) => [...keys.jobs.all, 'detail', id] as const,
  },

  investments: {
    all: ['investments'] as const,
    summary: () => [...keys.investments.all, 'summary'] as const,
    positions: () => [...keys.investments.all, 'positions'] as const,
    transactions: (params: Record<string, unknown> = {}) => [...keys.investments.all, 'transactions', params] as const,
    dividends: (params: Record<string, unknown> = {}) => [...keys.investments.all, 'dividends', params] as const,
    dividendSummary: (params: Record<string, unknown> = {}) => [...keys.investments.all, 'dividendSummary', params] as const,
    dividendSuggestions: () => [...keys.investments.all, 'dividendSuggestions'] as const,
    fno: (params: Record<string, unknown> = {}) => [...keys.investments.all, 'fno', params] as const,
    sips: () => [...keys.investments.all, 'sips'] as const,
    instruments: (query?: string) => [...keys.investments.all, 'instruments', query] as const,
    corporateActions: () => [...keys.investments.all, 'corporateActions'] as const,
    corporateActionsByInstrument: (instrumentId: string) => [...keys.investments.all, 'corporateActions', instrumentId] as const,
    priceHistory: (instrumentId: string) => [...keys.investments.all, 'priceHistory', instrumentId] as const,
    catalogSearch: (query: string, type?: InstrumentType) => [...keys.investments.all, 'catalogSearch', query, type] as const,
  },

  loans: {
    all: ['loans'] as const,
    list: (params: { status?: LoanStatus; page: number; size: number }) =>
      [...keys.loans.all, 'list', params] as const,
    summary: () => [...keys.loans.all, 'summary'] as const,
    byId: (id: string) => [...keys.loans.all, 'detail', id] as const,
    matchSuggestions: (id: string) => [...keys.loans.all, 'matchSuggestions', id] as const,
    /** Amortization schedule for a single loan (the server returns a grouping map; we normalise to a flat list). */
    schedule: (id: string) => [...keys.loans.all, 'schedule', id] as const,
  },

  lendings: {
    all: ['lendings'] as const,
    /** Paginated lending ledger entries, optionally scoped to one counterparty. */
    list: (params: { counterpartyId?: string; page: number; size: number }) =>
      [...keys.lendings.all, 'list', params] as const,
    /** Paginated counterparties list. There is no single-counterparty GET endpoint;
     *  callers find one by id within a (typically large-page) list. */
    counterparties: (params: { page: number; size: number }) =>
      [...keys.lendings.all, 'counterparties', params] as const,
    /** Upcoming obligations within a rolling window of `months`. */
    obligations: (months: number) => [...keys.lendings.all, 'obligations', months] as const,
  },

  rewards: {
    all: ['rewards'] as const,
    // Rules/capBuckets/milestones/config are all scoped to a single account —
    // without the accountId in the key, switching accounts would keep serving
    // the previous account's cached list.
    rules: (accountId: string) => [...keys.rewards.all, 'rules', accountId] as const,
    capBuckets: (accountId: string) => [...keys.rewards.all, 'capBuckets', accountId] as const,
    milestones: (accountId: string) => [...keys.rewards.all, 'milestones', accountId] as const,
    config: (accountId: string) => [...keys.rewards.all, 'config', accountId] as const,
    report: (accountId: string, from: string, to: string) =>
      [...keys.rewards.all, 'report', accountId, from, to] as const,
    lines: (params: Record<string, unknown> = {}) => [...keys.rewards.all, 'lines', params] as const,
  },

  rules: {
    all: ['rules'] as const,
    list: (params: Record<string, unknown> = {}) => [...keys.rules.all, 'list', params] as const,
    preview: (params: Record<string, unknown> = {}) => [...keys.rules.all, 'preview', params] as const,
  },

  reports: {
    all: ['reports'] as const,
    list: () => [...keys.reports.all, 'list'] as const,
    catalog: () => [...keys.reports.all, 'catalog'] as const,
    byId: (id: string) => [...keys.reports.all, 'detail', id] as const,
    run: (id: string, params: Record<string, unknown> = {}) => [...keys.reports.all, 'run', id, params] as const,
  },

  settings: {
    all: ['settings'] as const,
    llmKeys: () => [...keys.settings.all, 'llmKeys'] as const,
    llmRouting: () => [...keys.settings.all, 'llmRouting'] as const,
    llmRoutingOptions: () => [...keys.settings.all, 'llmRoutingOptions'] as const,
    llmHealth: () => [...keys.settings.all, 'llmHealth'] as const,
    llmCatalog: () => [...keys.settings.all, 'llmCatalog'] as const,
    gmailConnection: () => [...keys.settings.all, 'gmailConnection'] as const,
    gmailSenders: () => [...keys.settings.all, 'gmailSenders'] as const,
    gmailAttention: (params: Record<string, unknown> = {}) => [...keys.settings.all, 'gmailAttention', params] as const,
    deletionSummary: () => [...keys.settings.all, 'deletionSummary'] as const,
  },

  statements: {
    all: ['statements'] as const,
    byAccount: (accountId: string) => [...keys.statements.all, 'byAccount', accountId] as const,
    detail: (id: string) => [...keys.statements.all, 'detail', id] as const,
  },
};

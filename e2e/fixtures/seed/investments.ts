import type { components } from '../../../src/lib/api/schema.d.ts';
import { type ApiClient, expectStatus, waitForJob } from '../api';
import { createBrokerAccount } from './accounts';

export type InstrumentResponse = components['schemas']['InstrumentResponse'];
export type InstrumentRequest = components['schemas']['InstrumentRequest'];
export type ResolveInstrumentRequest = components['schemas']['ResolveInstrumentRequest'];
export type UpsertPriceRequest = components['schemas']['UpsertPriceRequest'];
export type UpdatePriceRequest = components['schemas']['UpdatePriceRequest'];
export type InstrumentPriceResponse = components['schemas']['InstrumentPriceResponse'];
export type InvestmentTransactionResponse = components['schemas']['InvestmentTransactionResponse'];
export type CreateInvestmentTransactionRequest = components['schemas']['CreateInvestmentTransactionRequest'];
export type UpdateInvestmentTransactionRequest = components['schemas']['UpdateInvestmentTransactionRequest'];
export type PositionsResponse = components['schemas']['PositionsResponse'];
export type SummaryResponse = components['schemas']['SummaryResponse'];
export type SipResponse = components['schemas']['SipResponse'];
export type CreateSipRequest = components['schemas']['CreateSipRequest'];
export type UpdateSipRequest = components['schemas']['UpdateSipRequest'];
export type DividendResponse = components['schemas']['DividendResponse'];
export type CreateDividendRequest = components['schemas']['CreateDividendRequest'];
export type UpdateDividendRequest = components['schemas']['UpdateDividendRequest'];
export type DividendSuggestionsResponse = components['schemas']['DividendSuggestionsResponse'];
export type AcceptSuggestionsResponse = components['schemas']['AcceptSuggestionsResponse'];
export type AcceptSuggestionsRequest = components['schemas']['AcceptSuggestionsRequest'];
export type JobResponse = components['schemas']['JobResponse'];

let idCounter = 0;

export function uniqueSeedSuffix(): string {
  idCounter += 1;
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${Date.now().toString().slice(-4)}${rand}${idCounter}`;
}

export function generateIsin(prefix = 'INE'): string {
  const suffix = uniqueSeedSuffix();
  return (prefix + suffix).slice(0, 11).padEnd(11, '0') + '1';
}

export function generateYahooSymbol(prefix = 'E2E'): string {
  const suffix = uniqueSeedSuffix();
  return `${prefix}${suffix}.NS`;
}

export async function createBroker(
  api: ApiClient,
  overrides?: Partial<components['schemas']['BrokerRequest']>
) {
  return createBrokerAccount(api, overrides);
}

export async function resolveInstrument(
  api: ApiClient,
  body: ResolveInstrumentRequest
): Promise<InstrumentResponse> {
  const res = await api.POST('/api/v1/instruments/resolve', { body });
  if (res.error || !res.data || (res.response.status !== 200 && res.response.status !== 201)) {
    throw new Error(
      `resolveInstrument failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function createInstrument(
  api: ApiClient,
  body: InstrumentRequest
): Promise<InstrumentResponse> {
  const res = await api.POST('/api/v1/instruments', { body });
  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createInstrument failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function trade(
  api: ApiClient,
  body: CreateInvestmentTransactionRequest
): Promise<InvestmentTransactionResponse> {
  const res = await api.POST('/api/v1/investments/transactions', { body });
  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `trade failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function positions(api: ApiClient): Promise<PositionsResponse> {
  const res = await api.GET('/api/v1/investments/positions');
  expectStatus(res, 200);
  return res.data!;
}

export async function summary(api: ApiClient): Promise<SummaryResponse> {
  const res = await api.GET('/api/v1/investments/summary');
  expectStatus(res, 200);
  return res.data!;
}

export async function refreshPrices(
  api: ApiClient,
  instrumentId?: string
): Promise<JobResponse> {
  const res = await api.POST('/api/v1/investments/prices/refresh', {
    params: {
      query: instrumentId ? { instrumentId } : undefined,
    },
  });
  if (res.error || !res.data || (res.response.status !== 200 && res.response.status !== 202)) {
    throw new Error(
      `refreshPrices failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  const jobId = (res.data as components['schemas']['EnqueueResponse']).jobId;
  return waitForJob(api, jobId);
}

export async function setManualPrice(
  api: ApiClient,
  instrumentId: string,
  body: UpsertPriceRequest
): Promise<InstrumentResponse> {
  const res = await api.POST('/api/v1/instruments/{id}/price', {
    params: { path: { id: instrumentId } },
    body,
  });
  if (res.error || !res.data || (res.response.status !== 200 && res.response.status !== 201)) {
    throw new Error(
      `setManualPrice failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function createSip(
  api: ApiClient,
  body: CreateSipRequest
): Promise<SipResponse> {
  const res = await api.POST('/api/v1/investments/sips', { body });
  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createSip failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function createDividend(
  api: ApiClient,
  body: CreateDividendRequest
): Promise<DividendResponse> {
  const res = await api.POST('/api/v1/investments/dividends', { body });
  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createDividend failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

export async function dividendSuggestions(
  api: ApiClient,
  brokerAccountId?: string
): Promise<DividendSuggestionsResponse> {
  const res = await api.GET('/api/v1/investments/dividends/suggestions', {
    params: {
      query: brokerAccountId ? { brokerAccountId } : undefined,
    },
  });
  expectStatus(res, 200);
  return res.data!;
}

export async function acceptSuggestions(
  api: ApiClient,
  items: components['schemas']['AcceptSuggestionsRequest']['items']
): Promise<AcceptSuggestionsResponse> {
  const res = await api.POST('/api/v1/investments/dividends/suggestions/accept', {
    body: { items },
  });
  if (res.error || !res.data || res.response.status !== 200) {
    throw new Error(
      `acceptSuggestions failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }
  return res.data;
}

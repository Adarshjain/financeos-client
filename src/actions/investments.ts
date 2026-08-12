'use server';

import { corporateActionsApi, dividendsApi, fnoApi, importsApi, instrumentsApi, investmentsApi } from '@/lib/apiClient';
import { validationError } from '@/lib/apiResult';
import { createDomainAction } from '@/lib/domainApi';
import { optionalDecimal, optionalString } from '@/lib/forms';
import type {
  AcceptSuggestionsRequest,
  AcceptSuggestionsResponse,
  ApiResult,
  Charges,
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
  FnoTradeResponse,
  ImportCommitRequest,
  ImportCommitResult,
  ImportPreview,
  Instrument,
  InstrumentCandidate,
  InstrumentType,
  InvestmentTransactionResponse,
  InvestmentTransactionType,
  PagedDividendResponse,
  PagedInvestmentTransactionResponse,
  PriceHistoryPoint,
  PriceRefreshResult,
  ReconcileCommitRequest,
  ReconcilePreview,
  ResolveInstrumentRequest,
  SetPriceRequest,
  UpdateCorporateActionRequest,
  UpdateDividendRequest,
  UpdateFnoTradeRequest,
  UpdateInvestmentTransactionRequest,
} from '@/lib/types';

const INVESTMENTS_PATHS = ['/investments', '/investments/fno'];

function extractChargesFromFormData(formData: FormData): Charges | undefined {
  const brokerage = optionalDecimal(formData, 'brokerage');
  const stt = optionalDecimal(formData, 'stt');
  const exchangeTxnCharges = optionalDecimal(formData, 'exchangeTxnCharges');
  const sebiCharges = optionalDecimal(formData, 'sebiCharges');
  const stampDuty = optionalDecimal(formData, 'stampDuty');
  const gst = optionalDecimal(formData, 'gst');
  const dpCharges = optionalDecimal(formData, 'dpCharges');
  const otherCharges = optionalDecimal(formData, 'otherCharges');

  const charges: Charges = {};
  let hasAny = false;
  if (brokerage !== undefined) { charges.brokerage = brokerage; hasAny = true; }
  if (stt !== undefined) { charges.stt = stt; hasAny = true; }
  if (exchangeTxnCharges !== undefined) { charges.exchangeTxnCharges = exchangeTxnCharges; hasAny = true; }
  if (sebiCharges !== undefined) { charges.sebiCharges = sebiCharges; hasAny = true; }
  if (stampDuty !== undefined) { charges.stampDuty = stampDuty; hasAny = true; }
  if (gst !== undefined) { charges.gst = gst; hasAny = true; }
  if (dpCharges !== undefined) { charges.dpCharges = dpCharges; hasAny = true; }
  if (otherCharges !== undefined) { charges.otherCharges = otherCharges; hasAny = true; }

  return hasAny ? charges : undefined;
}

export async function createInvestmentTransaction(
  _prevState: ApiResult<InvestmentTransactionResponse> | null,
  data: FormData | CreateInvestmentTransactionRequest
): Promise<ApiResult<InvestmentTransactionResponse>> {
  let req: CreateInvestmentTransactionRequest;

  if (data instanceof FormData) {
    const brokerAccountId = optionalString(data, 'brokerAccountId') || optionalString(data, 'accountId');
    const instrumentId = optionalString(data, 'instrumentId');
    const type = optionalString(data, 'type') as InvestmentTransactionType | undefined;
    const quantity = optionalDecimal(data, 'quantity');
    const price = optionalDecimal(data, 'price');
    const tradeDate = optionalString(data, 'tradeDate') || optionalString(data, 'date');
    const notes = optionalString(data, 'notes');
    const charges = extractChargesFromFormData(data);

    if (!brokerAccountId || !instrumentId || !type || quantity === undefined || price === undefined || !tradeDate) {
      return validationError('Broker account, instrument, type, quantity, price, and trade date are required.');
    }

    req = {
      brokerAccountId,
      instrumentId,
      type,
      quantity,
      price,
      tradeDate,
      charges,
      notes,
    };
  } else {
    req = data;
  }

  const action = createDomainAction(
    { fallbackError: 'Failed to create investment transaction', revalidatePaths: INVESTMENTS_PATHS },
    (r: CreateInvestmentTransactionRequest) => investmentsApi.createTransaction(r)
  );
  return action(req);
}

export const listInvestmentTransactions = createDomainAction(
  { fallbackError: 'Failed to load transactions' },
  (page: number, size: number, filters?: { brokerAccountId?: string; instrumentId?: string; holdingId?: string; search?: string }) =>
    investmentsApi.listTransactions(page, size, filters)
);

export const updateInvestmentTransaction = createDomainAction(
  { fallbackError: 'Failed to update investment transaction', revalidatePaths: INVESTMENTS_PATHS },
  (id: string, data: UpdateInvestmentTransactionRequest) => investmentsApi.updateTransaction(id, data)
);

export const deleteInvestmentTransaction = createDomainAction(
  { fallbackError: 'Failed to delete investment transaction', revalidatePaths: INVESTMENTS_PATHS },
  (id: string) => investmentsApi.deleteTransaction(id)
);

export const catalogSearch = createDomainAction(
  { fallbackError: 'Failed to search instrument catalog' },
  (query: string, type?: InstrumentType) => instrumentsApi.catalogSearch(query, type)
);

export const resolveInstrument = createDomainAction(
  { fallbackError: 'Failed to resolve instrument', revalidatePaths: INVESTMENTS_PATHS },
  (req: ResolveInstrumentRequest) => instrumentsApi.resolveInstrument(req)
);

export const createInstrument = createDomainAction(
  { fallbackError: 'Failed to create instrument', revalidatePaths: INVESTMENTS_PATHS },
  (data: CreateInstrumentRequest) => instrumentsApi.create(data)
);

export const updateInstrument = createDomainAction(
  { fallbackError: 'Failed to update instrument', revalidatePaths: INVESTMENTS_PATHS },
  (id: string, data: CreateInstrumentRequest) => instrumentsApi.update(id, data)
);

export const setInstrumentPrice = createDomainAction(
  { fallbackError: 'Failed to set instrument price', revalidatePaths: INVESTMENTS_PATHS },
  (id: string, data: SetPriceRequest) => instrumentsApi.setPrice(id, data)
);

export const refreshInvestmentPrices = createDomainAction(
  { fallbackError: 'Failed to refresh investment prices', revalidatePaths: INVESTMENTS_PATHS },
  (instrumentId?: string) => investmentsApi.refreshPrices(instrumentId)
);

// Dividends actions
export const listDividends = createDomainAction(
  { fallbackError: 'Failed to fetch dividends' },
  (page = 0, size = 25, filters?: { holdingId?: string; brokerAccountId?: string; instrumentId?: string; type?: DividendType; from?: string; to?: string }) =>
    dividendsApi.list({ page, size, ...filters })
);

export const getDividendSummary = createDomainAction(
  { fallbackError: 'Failed to fetch dividend summary' },
  (filters?: { holdingId?: string; brokerAccountId?: string; instrumentId?: string; type?: DividendType }) =>
    dividendsApi.summary(filters)
);

export const scanDividendSuggestions = createDomainAction(
  { fallbackError: 'Failed to scan dividend suggestions' },
  (brokerAccountId?: string) => dividendsApi.suggestions(brokerAccountId)
);

export const acceptDividendSuggestions = createDomainAction(
  { fallbackError: 'Failed to accept dividend suggestions', revalidatePaths: INVESTMENTS_PATHS },
  (data: AcceptSuggestionsRequest) => dividendsApi.acceptSuggestions(data)
);

export const createDividend = createDomainAction(
  { fallbackError: 'Failed to record dividend', revalidatePaths: INVESTMENTS_PATHS },
  (data: CreateDividendRequest) => dividendsApi.create(data)
);

export const updateDividend = createDomainAction(
  { fallbackError: 'Failed to update dividend', revalidatePaths: INVESTMENTS_PATHS },
  (id: string, data: UpdateDividendRequest) => dividendsApi.update(id, data)
);

export const deleteDividend = createDomainAction(
  { fallbackError: 'Failed to delete dividend', revalidatePaths: INVESTMENTS_PATHS },
  (id: string) => dividendsApi.delete(id)
);

export const getCorporateActions = createDomainAction(
  { fallbackError: 'Failed to fetch corporate actions' },
  (instrumentId: string) => corporateActionsApi.list(instrumentId)
);

export const createCorporateAction = createDomainAction(
  { fallbackError: 'Failed to create corporate action', revalidatePaths: INVESTMENTS_PATHS },
  (instrumentId: string, data: CreateCorporateActionRequest) => corporateActionsApi.create(instrumentId, data)
);

export const updateCorporateAction = createDomainAction(
  { fallbackError: 'Failed to update corporate action', revalidatePaths: INVESTMENTS_PATHS },
  (instrumentId: string, id: string, data: UpdateCorporateActionRequest) => corporateActionsApi.update(instrumentId, id, data)
);

export const deleteCorporateAction = createDomainAction(
  { fallbackError: 'Failed to delete corporate action', revalidatePaths: INVESTMENTS_PATHS },
  (instrumentId: string, id: string) => corporateActionsApi.delete(instrumentId, id)
);

// Imports actions
export const previewImport = createDomainAction(
  { fallbackError: 'Failed to preview import file' },
  (formData: FormData) => importsApi.preview(formData)
);

export const commitImport = createDomainAction(
  { fallbackError: 'Failed to commit import rows', revalidatePaths: INVESTMENTS_PATHS },
  (data: ImportCommitRequest) => importsApi.commit(data)
);

export const previewReconcileImport = createDomainAction(
  { fallbackError: 'Failed to preview broker reconciliation files' },
  (formData: FormData) => importsApi.previewReconcile(formData)
);

export const commitReconcileImport = createDomainAction(
  { fallbackError: 'Failed to commit reconciled executions', revalidatePaths: INVESTMENTS_PATHS },
  (data: ReconcileCommitRequest) => importsApi.commitReconcile(data)
);

export const getPriceHistory = createDomainAction(
  { fallbackError: 'Failed to load price history' },
  (instrumentId: string) => instrumentsApi.getPriceHistory(instrumentId)
);

export const updateInstrumentPrice = createDomainAction(
  { fallbackError: 'Failed to update price point', revalidatePaths: INVESTMENTS_PATHS },
  (instrumentId: string, priceId: string, price: number | string) => instrumentsApi.updatePrice(instrumentId, priceId, { price })
);

export const deleteInstrumentPrice = createDomainAction(
  { fallbackError: 'Failed to delete price point', revalidatePaths: INVESTMENTS_PATHS },
  (instrumentId: string, priceId: string) => instrumentsApi.deletePrice(instrumentId, priceId)
);

export const createFnoTrade = createDomainAction(
  { fallbackError: 'Failed to create FnO trade', revalidatePaths: INVESTMENTS_PATHS },
  (data: CreateFnoTradeRequest) => fnoApi.createTrade(data)
);

export const updateFnoTrade = createDomainAction(
  { fallbackError: 'Failed to update FnO trade', revalidatePaths: INVESTMENTS_PATHS },
  (id: string, data: UpdateFnoTradeRequest) => fnoApi.updateTrade(id, data)
);

export const deleteFnoTrade = createDomainAction(
  { fallbackError: 'Failed to delete FnO trade', revalidatePaths: INVESTMENTS_PATHS },
  (id: string) => fnoApi.deleteTrade(id)
);

'use server';

import { revalidatePath } from 'next/cache';

import { corporateActionsApi, dividendsApi, fnoApi, importsApi, instrumentsApi, investmentsApi } from '@/lib/apiClient';
import { apiResult, validationError } from '@/lib/apiResult';
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

  return apiResult('Failed to create investment transaction', async () => {
    const transaction = await investmentsApi.createTransaction(req);
    revalidatePath('/investments');
    return transaction;
  });
}

export async function listInvestmentTransactions(
  page: number,
  size: number,
  filters?: { brokerAccountId?: string; instrumentId?: string; holdingId?: string; search?: string }
): Promise<ApiResult<PagedInvestmentTransactionResponse>> {
  return apiResult('Failed to load transactions', async () => {
    return await investmentsApi.listTransactions(page, size, filters);
  });
}

export async function updateInvestmentTransaction(
  id: string,
  data: UpdateInvestmentTransactionRequest
): Promise<ApiResult<InvestmentTransactionResponse>> {
  return apiResult('Failed to update investment transaction', async () => {
    const transaction = await investmentsApi.updateTransaction(id, data);
    revalidatePath('/investments');
    return transaction;
  });
}

export async function deleteInvestmentTransaction(
  id: string
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete investment transaction', async () => {
    await investmentsApi.deleteTransaction(id);
    revalidatePath('/investments');
  });
}

export async function catalogSearch(
  query: string,
  type?: InstrumentType
): Promise<ApiResult<InstrumentCandidate[]>> {
  return apiResult('Failed to search instrument catalog', async () => {
    return await instrumentsApi.catalogSearch(query, type);
  });
}

export async function resolveInstrument(
  req: ResolveInstrumentRequest
): Promise<ApiResult<Instrument>> {
  return apiResult('Failed to resolve instrument', async () => {
    const instrument = await instrumentsApi.resolveInstrument(req);
    revalidatePath('/investments');
    return instrument;
  });
}

export async function createInstrument(
  data: CreateInstrumentRequest
): Promise<ApiResult<Instrument>> {
  return apiResult('Failed to create instrument', async () => {
    const instrument = await instrumentsApi.create(data);
    revalidatePath('/investments');
    return instrument;
  });
}

export async function updateInstrument(
  id: string,
  data: CreateInstrumentRequest
): Promise<ApiResult<Instrument>> {
  return apiResult('Failed to update instrument', async () => {
    const instrument = await instrumentsApi.update(id, data);
    revalidatePath('/investments');
    return instrument;
  });
}

export async function setInstrumentPrice(
  id: string,
  data: SetPriceRequest
): Promise<ApiResult<Instrument>> {
  return apiResult('Failed to set instrument price', async () => {
    const instrument = await instrumentsApi.setPrice(id, data);
    revalidatePath('/investments');
    return instrument;
  });
}

export async function refreshInvestmentPrices(
  instrumentId?: string
): Promise<ApiResult<PriceRefreshResult>> {
  return apiResult('Failed to refresh investment prices', async () => {
    const res = await investmentsApi.refreshPrices(instrumentId);
    revalidatePath('/investments');
    return res;
  });
}

// Dividends actions
export async function listDividends(
  page = 0,
  size = 25,
  filters?: {
    holdingId?: string;
    brokerAccountId?: string;
    instrumentId?: string;
    type?: DividendType;
    from?: string;
    to?: string;
  }
): Promise<ApiResult<PagedDividendResponse>> {
  return apiResult('Failed to fetch dividends', async () => {
    return await dividendsApi.list({ page, size, ...filters });
  });
}

export async function getDividendSummary(filters?: {
  holdingId?: string;
  brokerAccountId?: string;
  instrumentId?: string;
  type?: DividendType;
}): Promise<ApiResult<DividendSummary>> {
  return apiResult('Failed to fetch dividend summary', async () => {
    return await dividendsApi.summary(filters);
  });
}

export async function scanDividendSuggestions(
  brokerAccountId?: string
): Promise<ApiResult<DividendSuggestionsResponse>> {
  return apiResult('Failed to scan dividend suggestions', async () => {
    return await dividendsApi.suggestions(brokerAccountId);
  });
}

export async function acceptDividendSuggestions(
  data: AcceptSuggestionsRequest
): Promise<ApiResult<AcceptSuggestionsResponse>> {
  return apiResult('Failed to accept dividend suggestions', async () => {
    const res = await dividendsApi.acceptSuggestions(data);
    revalidatePath('/investments');
    return res;
  });
}

export async function createDividend(
  data: CreateDividendRequest
): Promise<ApiResult<Dividend>> {
  return apiResult('Failed to record dividend', async () => {
    const div = await dividendsApi.create(data);
    revalidatePath('/investments');
    return div;
  });
}

export async function updateDividend(
  id: string,
  data: UpdateDividendRequest
): Promise<ApiResult<Dividend>> {
  return apiResult('Failed to update dividend', async () => {
    const div = await dividendsApi.update(id, data);
    revalidatePath('/investments');
    return div;
  });
}

export async function deleteDividend(
  id: string
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete dividend', async () => {
    await dividendsApi.delete(id);
    revalidatePath('/investments');
  });
}

export async function getCorporateActions(
  instrumentId: string
): Promise<ApiResult<CorporateAction[]>> {
  return apiResult('Failed to fetch corporate actions', async () => {
    return await corporateActionsApi.list(instrumentId);
  });
}

export async function createCorporateAction(
  instrumentId: string,
  data: CreateCorporateActionRequest
): Promise<ApiResult<CorporateAction>> {
  return apiResult('Failed to create corporate action', async () => {
    const action = await corporateActionsApi.create(instrumentId, data);
    revalidatePath('/investments');
    return action;
  });
}

export async function updateCorporateAction(
  instrumentId: string,
  id: string,
  data: UpdateCorporateActionRequest
): Promise<ApiResult<CorporateAction>> {
  return apiResult('Failed to update corporate action', async () => {
    const action = await corporateActionsApi.update(instrumentId, id, data);
    revalidatePath('/investments');
    return action;
  });
}

export async function deleteCorporateAction(
  instrumentId: string,
  id: string
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete corporate action', async () => {
    await corporateActionsApi.delete(instrumentId, id);
    revalidatePath('/investments');
  });
}

// Imports actions (Phase 4a & Reconciliation)
export async function previewImport(
  formData: FormData
): Promise<ApiResult<ImportPreview>> {
  return apiResult('Failed to preview import file', async () => {
    return await importsApi.preview(formData);
  });
}

export async function commitImport(
  data: ImportCommitRequest
): Promise<ApiResult<ImportCommitResult>> {
  return apiResult('Failed to commit import rows', async () => {
    const res = await importsApi.commit(data);
    revalidatePath('/investments');
    return res;
  });
}

export async function previewReconcileImport(
  formData: FormData
): Promise<ApiResult<ReconcilePreview>> {
  return apiResult('Failed to preview broker reconciliation files', async () => {
    return await importsApi.previewReconcile(formData);
  });
}

export async function commitReconcileImport(
  data: ReconcileCommitRequest
): Promise<ApiResult<ImportCommitResult>> {
  return apiResult('Failed to commit reconciled executions', async () => {
    const res = await importsApi.commitReconcile(data);
    revalidatePath('/investments');
    return res;
  });
}

export async function getPriceHistory(
  instrumentId: string
): Promise<ApiResult<PriceHistoryPoint[]>> {
  return apiResult('Failed to load price history', async () => {
    return await instrumentsApi.getPriceHistory(instrumentId);
  });
}

export async function updateInstrumentPrice(
  instrumentId: string,
  priceId: string,
  price: number | string
): Promise<ApiResult<Instrument>> {
  return apiResult('Failed to update price point', async () => {
    const res = await instrumentsApi.updatePrice(instrumentId, priceId, { price });
    revalidatePath('/investments');
    return res;
  });
}

export async function deleteInstrumentPrice(
  instrumentId: string,
  priceId: string
): Promise<ApiResult<void>> {
  return apiResult('Failed to delete price point', async () => {
    await instrumentsApi.deletePrice(instrumentId, priceId);
    revalidatePath('/investments');
  });
}

export async function createFnoTrade(data: CreateFnoTradeRequest): Promise<ApiResult<FnoTradeResponse>> {
  return apiResult('Failed to create FnO trade', async () => {
    const res = await fnoApi.createTrade(data);
    revalidatePath('/investments/fno');
    revalidatePath('/investments');
    return res;
  });
}

export async function updateFnoTrade(id: string, data: UpdateFnoTradeRequest): Promise<ApiResult<FnoTradeResponse>> {
  return apiResult('Failed to update FnO trade', async () => {
    const res = await fnoApi.updateTrade(id, data);
    revalidatePath('/investments/fno');
    revalidatePath('/investments');
    return res;
  });
}

export async function deleteFnoTrade(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to delete FnO trade', async () => {
    await fnoApi.deleteTrade(id);
    revalidatePath('/investments/fno');
    revalidatePath('/investments');
  });
}


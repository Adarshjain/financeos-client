'use server';

import { serverApi } from '@/lib/api/server';
import type { CreateInvestmentTransactionRequest, UpdateInvestmentTransactionRequest } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type { InvestmentTransactionResponse } from '@/lib/types';

/** Records a trade in the tradebook. */
export const createTradeAction = createDomainAction(
  { fallbackError: "Couldn't record the trade. Try again." },
  async (body: CreateInvestmentTransactionRequest): Promise<InvestmentTransactionResponse> => {
    const { data } = await serverApi.POST('/api/v1/investments/transactions', { body });
    return data! as InvestmentTransactionResponse;
  },
);

/** Changes one trade. */
export const updateTradeAction = createDomainAction(
  { fallbackError: "Couldn't update the trade. Try again." },
  async (id: string, body: UpdateInvestmentTransactionRequest): Promise<InvestmentTransactionResponse> => {
    const { data } = await serverApi.PUT('/api/v1/investments/transactions/{id}', { params: { path: { id } }, body });
    return data! as InvestmentTransactionResponse;
  },
);

/** Deletes one trade. */
export const deleteTradeAction = createDomainAction(
  { fallbackError: "Couldn't delete the trade. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/investments/transactions/{id}', { params: { path: { id } } });
  },
);

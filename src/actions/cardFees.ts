'use server';

import { cardFeesApi, rewardsApi } from '@/lib/apiClient';
import type {
  CardFeeChargeRequest,
  CardFeeKind,
  CardFeeTermRequest,
} from '@/lib/cardFees.types';
import { createDomainAction } from '@/lib/domainApi';

const FEE_PATHS = ['/rewards', '/rewards/fees'];

export const listCardFeeTerms = createDomainAction(
  { fallbackError: 'Failed to load card fee terms' },
  (accountId: string) => cardFeesApi.listTerms(accountId)
);

export const createCardFeeTerm = createDomainAction(
  { fallbackError: 'Failed to create fee term', revalidatePaths: FEE_PATHS },
  (body: CardFeeTermRequest) => cardFeesApi.createTerm(body)
);

export const updateCardFeeTerm = createDomainAction(
  { fallbackError: 'Failed to update fee term', revalidatePaths: FEE_PATHS },
  (id: string, body: CardFeeTermRequest) => cardFeesApi.updateTerm(id, body)
);

export const deleteCardFeeTerm = createDomainAction(
  { fallbackError: 'Failed to delete fee term', revalidatePaths: FEE_PATHS },
  (id: string) => cardFeesApi.deleteTerm(id)
);

export const upsertCardFeeCharge = createDomainAction(
  { fallbackError: 'Failed to save fee override', revalidatePaths: FEE_PATHS },
  (body: CardFeeChargeRequest) => cardFeesApi.upsertCharge(body)
);

export const clearCardFeeCharge = createDomainAction(
  { fallbackError: 'Failed to clear fee override', revalidatePaths: FEE_PATHS },
  (params: { accountId: string; kind: CardFeeKind; feeYearStart: string }) =>
    cardFeesApi.clearCharge(params)
);

export const listFeeChargeCandidates = createDomainAction(
  { fallbackError: 'Failed to load candidate transactions' },
  (params: { accountId: string; kind: CardFeeKind; feeYearStart: string }) =>
    cardFeesApi.listCandidates(params)
);

export const getCardFeeSchedule = createDomainAction(
  { fallbackError: 'Failed to load card fee schedule' },
  (params: { accountId: string; from: string; to: string }) =>
    rewardsApi.feeSchedule(params)
);

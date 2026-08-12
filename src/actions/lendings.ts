'use server';

import { counterpartiesApi, lendingsApi, obligationsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type {
  CreateCounterpartyRequest,
  CreateLendingRequest,
  UpdateCounterpartyRequest,
  UpdateLendingRequest,
} from '@/lib/types';

const LENDINGS_PATHS = ['/loans/lendings'];

export const fetchCounterpartiesAction = createDomainAction(
  { fallbackError: 'Failed to fetch counterparties' },
  (page = 0, size = 50) => counterpartiesApi.list(page, size)
);

export const createCounterpartyAction = createDomainAction(
  { fallbackError: 'Failed to create counterparty', revalidatePaths: LENDINGS_PATHS },
  (data: CreateCounterpartyRequest) => counterpartiesApi.create(data)
);

export const updateCounterpartyAction = createDomainAction(
  { fallbackError: 'Failed to update counterparty', revalidatePaths: LENDINGS_PATHS },
  (id: string, data: UpdateCounterpartyRequest) => counterpartiesApi.update(id, data)
);

export const deleteCounterpartyAction = createDomainAction(
  { fallbackError: 'Failed to delete counterparty', revalidatePaths: LENDINGS_PATHS },
  (id: string) => counterpartiesApi.remove(id)
);

export const fetchLendingsAction = createDomainAction(
  { fallbackError: 'Failed to fetch lendings' },
  (counterpartyId?: string, page = 0, size = 50) => lendingsApi.list(counterpartyId, page, size)
);

export const fetchLendingDetailAction = createDomainAction(
  { fallbackError: 'Failed to fetch lending detail' },
  (id: string) => lendingsApi.getDetail(id)
);

export const createLendingAction = createDomainAction(
  { fallbackError: 'Failed to create lending', revalidatePaths: LENDINGS_PATHS },
  (data: CreateLendingRequest) => lendingsApi.create(data)
);

export const updateLendingAction = createDomainAction(
  { fallbackError: 'Failed to update lending', revalidatePaths: LENDINGS_PATHS },
  (id: string, data: UpdateLendingRequest, _counterpartyId?: string) => lendingsApi.update(id, data)
);

export const deleteLendingAction = createDomainAction(
  { fallbackError: 'Failed to delete lending', revalidatePaths: LENDINGS_PATHS },
  (id: string, _counterpartyId?: string) => lendingsApi.remove(id)
);

export const fetchUpcomingObligationsAction = createDomainAction(
  { fallbackError: 'Failed to fetch upcoming obligations' },
  (months = 3) => obligationsApi.getUpcoming(months)
);

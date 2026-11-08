'use server';

import { serverApi } from '@/lib/api/server';
import type { RecurringSeriesDto } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

/** Regular payments the server found and is proposing to track. */
export const loadRecurringProposals = action('recurring.loadRecurringProposals', createDomainAction(
  { fallbackError: "Couldn't load regular payments. Try again." },
  async (): Promise<RecurringSeriesDto[]> => {
    const { data } = await serverApi.GET('/api/v1/recurring/proposals');
    return (data ?? []) as RecurringSeriesDto[];
  },
));

/** Starts tracking a proposed series. */
export const trackRecurring = action('recurring.trackRecurring', createDomainAction(
  { fallbackError: "Couldn't track this payment. Try again." },
  async (id: string): Promise<RecurringSeriesDto> => {
    const { data } = await serverApi.POST('/api/v1/recurring/{id}/track', { params: { path: { id } } });
    return data! as RecurringSeriesDto;
  },
));

/** "Not regular": the series is not suggested again. */
export const dismissRecurring = action('recurring.dismissRecurring', createDomainAction(
  { fallbackError: "Couldn't dismiss this suggestion. Try again." },
  async (id: string): Promise<RecurringSeriesDto> => {
    const { data } = await serverApi.POST('/api/v1/recurring/{id}/dismiss', { params: { path: { id } } });
    return data! as RecurringSeriesDto;
  },
));

/** Stops tracking a series. */
export const stopRecurring = action('recurring.stopRecurring', createDomainAction(
  { fallbackError: "Couldn't stop tracking. Try again." },
  async (id: string): Promise<RecurringSeriesDto> => {
    const { data } = await serverApi.POST('/api/v1/recurring/{id}/stop', { params: { path: { id } } });
    return data! as RecurringSeriesDto;
  },
));

/** Marks a proposed EMI series as converted into a loan. */
export const convertRecurring = action('recurring.convertRecurring', createDomainAction(
  { fallbackError: "Couldn't link the loan to this payment. Try again." },
  async (id: string, loanId: string): Promise<RecurringSeriesDto> => {
    const { data } = await serverApi.POST('/api/v1/recurring/{id}/converted', {
      params: { path: { id } },
      body: { loanId },
    });
    return data! as RecurringSeriesDto;
  },
));

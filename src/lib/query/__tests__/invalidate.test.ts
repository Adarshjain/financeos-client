import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { invalidateLendingQueries } from '../invalidate';
import { keys } from '../keys';

describe('invalidateLendingQueries', () => {
  it('invalidates the lendings tree and the combined loans summary', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');

    await invalidateLendingQueries(qc);

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.lendings.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.loans.summary() });
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.obligations.all });
  });

  it('leaves loan lists/details alone (scoped to the summary, not keys.loans.all)', async () => {
    const qc = new QueryClient();
    const loansList = keys.loans.list({ page: 0, size: 50 });
    const loanDetail = keys.loans.byId('loan-1');
    const counterparties = keys.lendings.counterparties({ page: 0, size: 50 });
    qc.setQueryData(loansList, { content: [] });
    qc.setQueryData(loanDetail, { id: 'loan-1' });
    qc.setQueryData(keys.loans.summary(), { lentOutstanding: 1 });
    qc.setQueryData(counterparties, { content: [] });

    await invalidateLendingQueries(qc);

    expect(qc.getQueryState(keys.loans.summary())?.isInvalidated).toBe(true);
    expect(qc.getQueryState(counterparties)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(loansList)?.isInvalidated).toBe(false);
    expect(qc.getQueryState(loanDetail)?.isInvalidated).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { detailFixture, scheduleFixture } from './loanDetail.fixtures';

class NotFoundSignal extends Error {}
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFoundSignal('NEXT_NOT_FOUND');
  },
}));
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T>(fn: T) => fn }));

const api = vi.hoisted(() => ({
  getDetail: vi.fn(),
  getSchedule: vi.fn(),
  list: vi.fn(),
}));
vi.mock('@/lib/apiClient', () => ({
  loansApi: { getDetail: api.getDetail, getSchedule: api.getSchedule },
  accountsApi: { list: api.list },
}));

import { loadLoanPage } from './loanDetailData';

const apiError = (status: number) => new ApiError(status, { message: 'x', code: 'X' } as never);

beforeEach(() => {
  vi.clearAllMocks();
  api.getDetail.mockResolvedValue(detailFixture());
  api.getSchedule.mockResolvedValue(scheduleFixture());
  api.list.mockResolvedValue([{ id: 'b1', name: 'HDFC Bank Savings' }]);
});

describe('loadLoanPage', () => {
  it('returns the loan, its schedule and the name of the account it is paid from', async () => {
    const page = await loadLoanPage('l1');
    expect(page.detail.loan.id).toBe('l1');
    expect(page.schedule).toHaveLength(7);
    expect(page.paymentAccountName).toBe('HDFC Bank Savings');
  });

  it('has no account name when the loan has no payment account or it is gone', async () => {
    api.list.mockResolvedValue([]);
    expect((await loadLoanPage('l1')).paymentAccountName).toBeNull();
    api.getDetail.mockResolvedValue({ ...detailFixture(), loan: { ...detailFixture().loan, paymentAccountId: null } });
    expect((await loadLoanPage('l1')).paymentAccountName).toBeNull();
  });

  it('is a 404 when the loan does not exist', async () => {
    api.getDetail.mockRejectedValue(apiError(404));
    await expect(loadLoanPage('missing')).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it('throws to the error state for any other failure of the loan', async () => {
    api.getDetail.mockRejectedValue(apiError(500));
    await expect(loadLoanPage('l1')).rejects.toBeInstanceOf(ApiError);
  });

  it('still shows the loan when the schedule or the accounts fail', async () => {
    api.getSchedule.mockRejectedValue(apiError(500));
    api.list.mockRejectedValue(apiError(500));
    const page = await loadLoanPage('l1');
    expect(page.schedule).toEqual([]);
    expect(page.paymentAccountName).toBeNull();
  });
});

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
}));
vi.mock('@/lib/apiClient', () => ({
  loansApi: { getDetail: api.getDetail, getSchedule: api.getSchedule },
}));

import { loadLoanPage } from './loanDetailData';

const apiError = (status: number) => new ApiError(status, { message: 'x', code: 'X' } as never);

beforeEach(() => {
  vi.clearAllMocks();
  api.getDetail.mockResolvedValue(detailFixture());
  api.getSchedule.mockResolvedValue(scheduleFixture());
});

describe('loadLoanPage', () => {
  it('returns the loan and its schedule', async () => {
    const page = await loadLoanPage('l1');
    expect(page.detail.loan.id).toBe('l1');
    expect(page.schedule).toHaveLength(7);
  });

  it('is a 404 when the loan does not exist', async () => {
    api.getDetail.mockRejectedValue(apiError(404));
    await expect(loadLoanPage('missing')).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it('is a 404 too when the server rejects the id itself (400)', async () => {
    api.getDetail.mockRejectedValue(apiError(400));
    await expect(loadLoanPage('not-a-loan')).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it('throws to the error state for any other failure of the loan', async () => {
    api.getDetail.mockRejectedValue(apiError(500));
    await expect(loadLoanPage('l1')).rejects.toBeInstanceOf(ApiError);
  });

  it('still shows the loan when the schedule fails', async () => {
    api.getSchedule.mockRejectedValue(apiError(500));
    const page = await loadLoanPage('l1');
    expect(page.schedule).toEqual([]);
  });
});

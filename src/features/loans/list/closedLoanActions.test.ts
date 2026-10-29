import { beforeEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => ({ fetchLoans: vi.fn() }));
vi.mock('@/features/loans/loansServerApi', () => server);
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-21' }));

import { loadClosedLoans } from './closedLoanActions';

const loan = (id: string, status: 'closed' | 'foreclosed') => ({
  id,
  name: id,
  loanType: 'home',
  rateType: 'fixed',
  currentAnnualRatePct: 9,
  currentEmi: 100,
  outstandingPrincipal: 0,
  totalInstallments: 12,
  settledInstallments: 12,
  nextDueDate: null,
  projectedEndDate: null,
  status,
});

beforeEach(() => {
  server.fetchLoans.mockReset();
});

describe('loadClosedLoans', () => {
  it('loads closed and foreclosed loans for the search, closed first, as closed rows', async () => {
    server.fetchLoans.mockImplementation(async ({ status }: { status: 'closed' | 'foreclosed' }) => ({
      content: [loan(status === 'closed' ? 'c1' : 'f1', status)],
      totalPages: 1,
    }));
    const result = await loadClosedLoans('bike');
    expect(server.fetchLoans).toHaveBeenCalledWith({ status: 'closed', q: 'bike', page: 0, size: 100 });
    expect(server.fetchLoans).toHaveBeenCalledWith({ status: 'foreclosed', q: 'bike', page: 0, size: 100 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((r) => [r.id, r.closed, r.next])).toEqual([
        ['c1', true, { kind: 'status', label: 'Closed' }],
        ['f1', true, { kind: 'status', label: 'Foreclosed' }],
      ]);
    }
  });

  it('reads every page of each status, not just the first', async () => {
    server.fetchLoans.mockImplementation(async ({ status, page }: { status: 'closed' | 'foreclosed'; page: number }) => {
      if (status === 'foreclosed') return { content: [], totalPages: 0 };
      return { content: [loan(`c${page}`, 'closed')], totalPages: 3 };
    });
    const result = await loadClosedLoans('');
    expect(server.fetchLoans.mock.calls.filter(([q]) => q.status === 'closed').map(([q]) => q.page)).toEqual([0, 1, 2]);
    expect(result.success && result.data.map((r) => r.id)).toEqual(['c0', 'c1', 'c2']);
  });

  it('reports a failure instead of throwing', async () => {
    server.fetchLoans.mockRejectedValue(new Error('down'));
    const result = await loadClosedLoans('');
    expect(result).toMatchObject({ success: false });
  });
});

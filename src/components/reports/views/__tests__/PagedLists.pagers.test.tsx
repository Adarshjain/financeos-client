import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api/client', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/client')>(
      '@/lib/api/client'
    );
  return {
    ...actual,
    api: {
      GET: vi.fn(),
      POST: vi.fn(),
      PUT: vi.fn(),
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    },
  };
});
vi.mock(
  '@/components/ui/select',
  async () => (await import('@/test/mockSelect')).selectMock
);

import { LoansList } from '@/app/(protected)/loans/browser/LoansList';
import { CounterpartiesList } from '@/app/(protected)/loans/lendings/browser/CounterpartiesList';
import { JobsHistoryTable } from '@/app/(protected)/settings/activity/components/JobsHistoryTable';
import { RewardLinesTable } from '@/components/rewards/browser/RewardLinesTable';
import { api } from '@/lib/api/client';
import type { JobResponse } from '@/lib/jobs.types';
import type { Page } from '@/lib/pagination';
import type { RewardLine } from '@/lib/rewards.types';
import type { CounterpartyResponse, LoanResponse } from '@/lib/types';
import { expectPagersAroundList } from '@/test/pagers';
import { renderWithQuery } from '@/test/renderWithQuery';

function paged<T>(
  content: T[],
  totalElements: number,
  number = 0,
  size = 20
): Page<T> {
  const totalPages = Math.ceil(totalElements / size);
  return {
    content,
    totalElements,
    totalPages,
    size,
    number,
    first: number === 0,
    last: false,
    empty: !content.length,
  };
}
const bottomPager = () =>
  screen.getAllByRole('navigation', { name: 'Pagination' })[1];

const loan = {
  id: 'l1',
  name: 'Home Loan',
  lender: 'HDFC',
  loanType: 'HOME',
  status: 'ACTIVE',
  totalInstallments: 240,
  settledInstallments: 12,
  outstandingPrincipal: 4_000_000,
  currentEmi: 40_000,
  currentAnnualRatePct: 8.5,
  effectiveAprPct: 8.7,
  nextDueDate: '2026-11-05',
} as unknown as LoanResponse;

const counterparty = {
  id: 'cp1',
  name: 'Ravi',
  notes: null,
  entryCount: 2,
  netPosition: 500,
  totalLent: 1000,
  totalBorrowed: 0,
  repaidToYou: 500,
  repaidByYou: 0,
} as unknown as CounterpartyResponse;

const line: RewardLine = {
  transactionId: 't1',
  transactionDate: '2026-09-01',
  effectiveDate: '2026-09-01',
  description: 'Amazon order',
  amount: 1000,
  basis: 1000,
  ruleName: 'Online 5%',
  earned: 50,
  earnedUnit: 'RUPEES',
  reason: 'MATCHED',
};

describe('Loans list pagers', () => {
  it('shows the pager above and below the loans and pages from the bottom', () => {
    const onPageChange = vi.fn();
    render(
      <LoansList
        page={paged([loan], 45)}
        filteredContent={[loan]}
        onPageChange={onPageChange}
      />
    );
    expectPagersAroundList(screen.getAllByText('Home Loan')[0]);
    fireEvent.click(
      within(bottomPager()).getByRole('button', { name: 'Page 3' })
    );
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows no pager when there are no loans', () => {
    render(
      <LoansList
        page={paged([], 0)}
        filteredContent={[]}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    expect(screen.queryByText('0 rows')).toBeNull();
  });
});

describe('Counterparties list pagers', () => {
  it('shows the pager above and below the counterparties and pages from the bottom', () => {
    const onPageChange = vi.fn();
    render(
      <CounterpartiesList
        page={paged([counterparty], 45)}
        filteredContent={[counterparty]}
        onPageChange={onPageChange}
        onDeleteCp={vi.fn()}
      />
    );
    expectPagersAroundList(screen.getAllByText('Ravi')[0]);
    fireEvent.click(
      within(bottomPager()).getByRole('button', { name: 'Next page' })
    );
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});

describe('Reward lines pagers', () => {
  it('shows the pager above and below the lines, with the page size on top', () => {
    const onPageChange = vi.fn();
    const onSizeChange = vi.fn();
    render(
      <RewardLinesTable
        lines={paged([line], 120, 0, 50)}
        loading={false}
        onSelectLine={vi.fn()}
        page={0}
        pageSize={50}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
      />
    );
    expectPagersAroundList(screen.getAllByText('Amazon order')[0]);
    expect(screen.getAllByText('120 lines')).toHaveLength(2);
    fireEvent.click(screen.getByRole('option', { name: '100 / page' }));
    expect(onSizeChange).toHaveBeenCalledWith(100);
    fireEvent.click(
      within(bottomPager()).getByRole('button', { name: 'Page 3' })
    );
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows no pager before lines load or for an empty range', () => {
    const props = {
      loading: false,
      onSelectLine: vi.fn(),
      page: 0,
      pageSize: 50,
      onPageChange: vi.fn(),
      onSizeChange: vi.fn(),
    };
    const { rerender } = render(<RewardLinesTable lines={null} {...props} />);
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    rerender(<RewardLinesTable lines={paged([], 0, 0, 50)} {...props} />);
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    expect(screen.queryByText('0 lines')).toBeNull();
  });
});

describe('Activity (jobs history) pagers', () => {
  const job = (id: string): JobResponse =>
    ({
      id,
      type: 'RULE_APPLY',
      status: 'SUCCEEDED',
      triggerSource: 'USER',
      cancelRequested: false,
      attempt: 1,
      createdAt: '2026-10-01T10:00:00Z',
      finishedAt: '2026-10-01T10:00:05Z',
    }) as JobResponse;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the shared pager above and below the jobs, and pages through the URL', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: paged([job('j1')], 70, 1),
    } as never);
    renderWithQuery(
      <JobsHistoryTable
        page={1}
        size={20}
        statusFilter="FAILED"
        typeFilter=""
      />
    );
    expect(await screen.findAllByText('70 jobs')).toHaveLength(2);
    expect(
      screen.getAllByRole('navigation', { name: 'Pagination' })
    ).toHaveLength(2);
    expect(screen.getAllByText('21–40')).toHaveLength(2);

    fireEvent.click(
      within(bottomPager()).getByRole('button', { name: 'Page 4' })
    );
    expect(push).toHaveBeenCalledWith(
      '/settings/activity?status=FAILED&page=3',
      { scroll: false }
    );

    const top = screen.getAllByRole('navigation', { name: 'Pagination' })[0];
    fireEvent.click(within(top).getByRole('button', { name: 'Previous page' }));
    expect(push).toHaveBeenLastCalledWith('/settings/activity?status=FAILED', {
      scroll: false,
    });
  });

  it('shows no pager when there are no jobs', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: paged([], 0) } as never);
    renderWithQuery(
      <JobsHistoryTable page={0} size={20} statusFilter="" typeFilter="" />
    );
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    expect(screen.queryByText('0 jobs')).toBeNull();
  });
});

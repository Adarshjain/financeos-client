import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoansListCard } from './LoansListCard';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('./closedLoanActions', () => ({ loadClosedLoans: vi.fn() }));

const base = { rows: [], totalElements: 0, totalPages: 0, closedLine: '' };

describe('LoansListCard empty', () => {
  it('a search with no match offers Clear filters', () => {
    render(<LoansListCard {...base} state={{ q: 'zzz', page: 0, size: 25 }} />);
    expect(screen.getByText('No loans match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenCalledWith('/loans', { scroll: false });
  });

  it('no loans at all says so and has no clear action', () => {
    render(<LoansListCard {...base} state={{ q: '', page: 0, size: 25 }} />);
    expect(screen.getByText('No loans yet. Add a loan to track its EMIs.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });
});

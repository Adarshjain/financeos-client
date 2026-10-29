import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LendingsListCard } from './LendingsListCard';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const base = { rows: [], totalElements: 0, totalPages: 0 };

describe('LendingsListCard empty', () => {
  it('filters with no match offer Clear filters', () => {
    render(<LendingsListCard {...base} state={{ q: 'zz', filter: 'owe', page: 0, size: 25 }} />);
    expect(screen.getByText('No people match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenCalledWith('/loans/lendings', { scroll: false });
  });

  it('no lendings at all says so and has no clear action', () => {
    render(<LendingsListCard {...base} state={{ q: '', filter: 'all', page: 0, size: 25 }} />);
    expect(screen.getByText('No lendings yet. Add a lending to start a ledger.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });
});

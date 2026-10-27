import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LendingsListCard } from './LendingsListCard';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const user = userEvent.setup({ pointerEventsCheck: 0 });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LendingsListCard paging', () => {
  it('a new page size goes back to the first page and keeps the search and chip', async () => {
    render(
      <LendingsListCard
        state={{ q: 'pri', filter: 'owe', page: 2, size: 25 }}
        rows={[]}
        totalElements={90}
        totalPages={4}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: 'Rows per page' })[0]);
    await user.click(screen.getByRole('option', { name: '10 / page' }));
    expect(router.push).toHaveBeenCalledWith('/loans/lendings?q=pri&filter=owe&size=10', { scroll: false });
  });

  it('a search typed right after a chip keeps the chip that was just chosen', async () => {
    render(
      <LendingsListCard
        state={{ q: '', filter: 'settled', page: 0, size: 25 }}
        rows={[]}
        totalElements={0}
        totalPages={0}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(router.push).toHaveBeenLastCalledWith('/loans/lendings', { scroll: false });
    // The page still carries filter=settled: the push has not landed yet.
    await user.type(screen.getByPlaceholderText('Search'), 'priya');
    await waitFor(() =>
      expect(router.push).toHaveBeenLastCalledWith('/loans/lendings?q=priya', { scroll: false }),
    );
  });
});

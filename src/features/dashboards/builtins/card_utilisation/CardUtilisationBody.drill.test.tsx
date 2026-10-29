import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/features/reports/underlying/LazyReportUnderlyingDialogs', () => ({
  LazyReportRowBreakdownDialog: (p: { datasource: string; rowId: string; title: string; onClose: () => void }) => (
    <button type="button" data-testid="breakdown" data-datasource={p.datasource} data-row-id={p.rowId} data-title={p.title} onClick={p.onClose} />
  ),
}));

import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { bodyProps, card } from '../testFixtures';
import { CardUtilisationBody } from './CardUtilisationBody';

describe('CardUtilisationBody owed amount drill', () => {
  beforeEach(() => vi.resetAllMocks());

  it('the owed amount opens that card\'s net worth breakdown, and closing unmounts it', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [card({ id: 'c-high', name: 'High Card', balance: -80000, utilizationPct: 80 }), card({ id: 'c-low', name: 'Low Card', balance: -10000, utilizationPct: 10 })] as unknown as Account[],
    } as never);
    renderWithQuery(<CardUtilisationBody {...bodyProps('card_utilisation')} />);
    const rows = await screen.findAllByTestId('utilisation-row');
    await userEvent.click(within(rows[1]).getByRole('button', { name: '₹10,000' }));
    const dialog = screen.getByTestId('breakdown');
    expect(dialog).toHaveAttribute('data-datasource', 'net_worth');
    expect(dialog).toHaveAttribute('data-row-id', 'c-low');
    expect(dialog).toHaveAttribute('data-title', 'Low Card');
    await userEvent.click(dialog);
    expect(screen.queryByTestId('breakdown')).not.toBeInTheDocument();
  });
});

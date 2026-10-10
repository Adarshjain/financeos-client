import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});

import { PriceHistoryPanel } from '@/app/(protected)/investments/PriceHistoryPanel';
import { api } from '@/lib/api/client';
import type { PriceHistoryPoint } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { renderWithQuery } from '@/test/renderWithQuery';

const points: PriceHistoryPoint[] = [
  { id: 'own', asOf: '2026-10-09', close: 110, source: 'MANUAL', editable: true },
  // A MANUAL row the caller may not change (the server marks only their own rows editable).
  { id: 'not-own', asOf: '2026-10-08', close: 105, source: 'MANUAL', editable: false },
  { id: 'feed', asOf: '2026-10-07', close: 100, source: 'YAHOO', editable: false },
  { id: 'legacy', asOf: '2026-10-06', close: 99, source: 'MANUAL' },
];

/** The log row for an ISO date (the row is the element holding the date and the price actions). */
function rowOf(isoDate: string): HTMLElement {
  return screen.getByText(formatDate(isoDate)).closest('div.p-2\\.5') as HTMLElement;
}

describe('PriceHistoryPanel — edit/delete follow `editable`', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: points } as never);
  });

  it('offers edit and delete only on the rows the server marks editable', async () => {
    renderWithQuery(<PriceHistoryPanel instrument={{ id: 'i1', name: 'Acme' }} />);
    expect(await screen.findByText('Price History Log (4)')).toBeInTheDocument();

    expect(screen.getAllByTitle('Edit manual price')).toHaveLength(1);
    expect(screen.getAllByTitle('Delete manual price')).toHaveLength(1);

    const own = rowOf('2026-10-09');
    expect(within(own).getByTitle('Edit manual price')).toBeInTheDocument();
    expect(within(own).getByTitle('Delete manual price')).toBeInTheDocument();

    for (const date of ['2026-10-08', '2026-10-07', '2026-10-06']) {
      expect(within(rowOf(date)).queryByTitle('Edit manual price')).toBeNull();
      expect(within(rowOf(date)).queryByTitle('Delete manual price')).toBeNull();
    }
  });
});

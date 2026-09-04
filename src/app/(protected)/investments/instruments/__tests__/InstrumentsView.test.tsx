import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
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

import { InstrumentsView } from '@/app/(protected)/investments/instruments/InstrumentsView';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { Instrument } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

const instrumentA: Instrument = {
  id: 'inst-1',
  symbol: 'RELIANCE',
  name: 'Reliance Industries Limited',
  type: 'stock',
  currency: 'INR',
};

const instrumentB: Instrument = {
  id: 'inst-2',
  symbol: 'HDFCBANK',
  name: 'HDFC Bank Limited',
  type: 'stock',
  currency: 'INR',
};

describe('InstrumentsView — Query Cache Invalidation Loop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates live when keys.investments.all is invalidated after instrument creation/update', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [instrumentA] } as never);

    const { queryClient } = renderWithQuery(<InstrumentsView />);

    expect(await screen.findByText('Instruments (1)')).toBeInTheDocument();
    expect(screen.getAllByText('Reliance Industries Limited').length).toBeGreaterThan(0);
    expect(screen.queryByText('HDFC Bank Limited')).toBeNull();

    // Change mock to return both instruments after invalidation
    vi.mocked(api.GET).mockResolvedValue({ data: [instrumentA, instrumentB] } as never);

    await queryClient.invalidateQueries({ queryKey: keys.investments.all });

    await waitFor(() => {
      expect(screen.getByText('Instruments (2)')).toBeInTheDocument();
    });
    expect(screen.getAllByText('HDFC Bank Limited').length).toBeGreaterThan(0);
  });
});

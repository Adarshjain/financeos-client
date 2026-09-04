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

import { HoldingsView } from '@/app/(protected)/investments/HoldingsView';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { AccountType, Position } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

const mockBroker = {
  id: 'broker-1',
  name: 'Zerodha Kite',
  type: AccountType.BROKER,
  closedOn: null,
};

const positionA: Position = {
  holdingId: 'hold-1',
  brokerAccountId: 'broker-1',
  brokerName: 'Zerodha Kite',
  provider: 'MANUAL',
  instrument: {
    id: 'inst-1',
    symbol: 'INFY',
    name: 'Infosys Limited',
    type: 'stock',
  },
  quantity: 10,
  avgCost: 1500,
  lastPrice: 1600,
  invested: 15000,
  currentValue: 16000,
  unrealizedGainLoss: 1000,
  unrealizedGainLossPercent: 6.67,
  realizedGainLoss: 0,
};

const positionB: Position = {
  holdingId: 'hold-2',
  brokerAccountId: 'broker-1',
  brokerName: 'Zerodha Kite',
  provider: 'MANUAL',
  instrument: {
    id: 'inst-2',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    type: 'stock',
  },
  quantity: 5,
  avgCost: 3500,
  lastPrice: 3800,
  invested: 17500,
  currentValue: 19000,
  unrealizedGainLoss: 1500,
  unrealizedGainLossPercent: 8.57,
  realizedGainLoss: 0,
};

describe('HoldingsView — Query Cache Invalidation Loop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates live when keys.investments.all is invalidated after trade mutation', async () => {
    vi.mocked(api.GET).mockImplementation(async (url: string) => {
      if (url === '/api/v1/investments/positions') {
        return { data: { positions: [positionA] } } as never;
      }
      if (url === '/api/v1/accounts') {
        return { data: [mockBroker] } as never;
      }
      return { data: null } as never;
    });

    const { queryClient } = renderWithQuery(<HoldingsView />);

    expect(await screen.findByText('Portfolio Holdings (1)')).toBeInTheDocument();
    expect(screen.getByText('INFY')).toBeInTheDocument();
    expect(screen.queryByText('TCS')).toBeNull();

    // Invalidate after mutation with updated positions
    vi.mocked(api.GET).mockImplementation(async (url: string) => {
      if (url === '/api/v1/investments/positions') {
        return { data: { positions: [positionA, positionB] } } as never;
      }
      if (url === '/api/v1/accounts') {
        return { data: [mockBroker] } as never;
      }
      return { data: null } as never;
    });

    await queryClient.invalidateQueries({ queryKey: keys.investments.all });

    await waitFor(() => {
      expect(screen.getByText('Portfolio Holdings (2)')).toBeInTheDocument();
    });
    expect(screen.getByText('TCS')).toBeInTheDocument();
  });
});

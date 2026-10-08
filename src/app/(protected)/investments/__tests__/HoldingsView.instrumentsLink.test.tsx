import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('@/lib/query/hooks/useInvestments', () => ({ usePositions: () => ({ data: [] }) }));
vi.mock('../CreateInstrumentDialog', () => ({ CreateInstrumentDialog: () => null }));
vi.mock('../RecordTradeDialog', () => ({ RecordTradeDialog: () => null }));
vi.mock('../HoldingsTab', () => ({ HoldingsTab: () => <div>tab</div> }));

import { HoldingsView } from '../HoldingsView';

describe('HoldingsView Instruments link', () => {
  it('links to the instruments page', () => {
    render(<HoldingsView />);
    expect(screen.getByRole('link', { name: 'Instruments' })).toHaveAttribute('href', '/investments/instruments');
  });
});

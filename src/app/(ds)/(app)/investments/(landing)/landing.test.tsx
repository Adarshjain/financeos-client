import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { summary as epfSummary } from '@/features/investments/epf/epf.fixtures';
import { holdingRow, holdingsResponse } from '@/features/investments/holdings/holdings.fixtures';
import { npsAccount, npsSummary } from '@/features/investments/retirement/retirement.fixtures';

import DsInvestmentsLandingLoading from './loading';
import DsInvestmentsLandingPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const holdings = vi.hoisted(() => ({ fetchHoldings: vi.fn() }));
const epf = vi.hoisted(() => ({ fetchEpfSummary: vi.fn(), fetchEpfEmployers: vi.fn() }));
const nps = vi.hoisted(() => ({ fetchNpsSummary: vi.fn() }));
vi.mock('@/features/investments/investmentsServerApi', () => holdings);
vi.mock('@/features/investments/epf/epfServerApi', () => epf);
vi.mock('@/features/investments/nps/npsServerApi', () => nps);

beforeEach(() => {
  vi.clearAllMocks();
  holdings.fetchHoldings.mockResolvedValue(holdingsResponse([holdingRow()]));
  epf.fetchEpfSummary.mockResolvedValue(epfSummary());
  epf.fetchEpfEmployers.mockResolvedValue([]);
  nps.fetchNpsSummary.mockResolvedValue(npsSummary([npsAccount()]));
});

describe('/investments landing', () => {
  it('loads the holdings header (one row), the EPF summary and employers, and the NPS summary, then links each tile', async () => {
    render(await DsInvestmentsLandingPage());
    expect(holdings.fetchHoldings).toHaveBeenCalledWith({ sort: 'name', page: 0, size: 1 });
    expect(screen.getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/investments/holdings', '/investments/epf', '/investments/nps?account=a1']);
    // The hero totals the three products; each shows in its table row and its tile.
    expect(screen.getByText('₹20,76,298')).toBeInTheDocument();
    for (const value of ['₹6,38,208', '₹8,43,210', '₹5,94,880']) expect(screen.getAllByText(value)).toHaveLength(2);
  });

  it('shows the failed product as an error card and still the others', async () => {
    epf.fetchEpfSummary.mockRejectedValue(new Error('boom'));
    render(await DsInvestmentsLandingPage());
    expect(screen.getAllByText(/Couldn't load EPF/).length).toBeGreaterThan(0);
    expect(screen.getByText('Without EPF')).toBeInTheDocument();
    expect(screen.getAllByText('₹6,38,208')).toHaveLength(2);
    expect(screen.getAllByText('₹5,94,880')).toHaveLength(2);
  });

  it('draws the skeleton while it loads', () => {
    const { container } = render(<DsInvestmentsLandingLoading />);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(2);
  });
});

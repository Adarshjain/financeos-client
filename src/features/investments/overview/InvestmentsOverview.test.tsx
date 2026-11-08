import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { employer, summary as epfSummary } from '../epf/epf.fixtures';
import { holdingRow, holdingsResponse } from '../holdings/holdings.fixtures';
import { npsAccount, npsSummary } from '../retirement/retirement.fixtures';
import { InvestmentsOverview, InvestmentsOverviewSkeleton } from './InvestmentsOverview';
import { overviewCards } from './overviewModel';

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const ok = <T,>(data: T) => ({ ok: true as const, data });
const bad = { ok: false as const };
const child = npsAccount({ id: 'a2', relation: 'CHILD', sector: 'VATSALYA', holderName: 'Aarav', pranMasked: 'XXXXXXX5208', tier1Status: null, tiers: [{ tier: 'I', value: 95260, invested: 90000, gain: 5260, schemes: [] }] });
const NAV = { a1: '2026-11-05', a2: '2026-08-31' };

const full = () => overviewCards({ holdings: ok(holdingsResponse([holdingRow()])), epf: ok(epfSummary()), employers: ok([employer()]), nps: ok(npsSummary([npsAccount(), child], NAV)) });

/** The desktop table's row for a product (both layouts render in jsdom; CSS hides one). */
const row = (name: string) => within(screen.getByRole('table')).getByText(name).closest('[data-ds-row]') as HTMLElement;

beforeEach(() => vi.clearAllMocks());

describe('InvestmentsOverview: hero', () => {
  it('shows the total of every product, the net-worth figure and the split legend', () => {
    render(<InvestmentsOverview cards={full()} />);
    expect(screen.getByText('Total value')).toBeInTheDocument();
    expect(screen.getByText('₹21,71,558')).toBeInTheDocument();
    expect(screen.getByText('In your net worth')).toBeInTheDocument();
    expect(screen.getByText('₹20,76,298')).toBeInTheDocument();
    for (const label of ['Stocks & funds 29%', 'EPF 39%', 'NPS 27%', 'NPS Vatsalya 4%']) expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('has no net-worth figure without a child account', () => {
    render(<InvestmentsOverview cards={overviewCards({ holdings: ok(holdingsResponse([holdingRow()])), epf: ok(epfSummary()), employers: ok([employer()]), nps: ok(npsSummary([npsAccount()], NAV)) })} />);
    expect(screen.queryByText('In your net worth')).toBeNull();
  });

  it('says what is missing when a product failed', () => {
    render(<InvestmentsOverview cards={overviewCards({ holdings: bad, epf: ok(epfSummary()), employers: ok([employer()]), nps: ok(npsSummary([npsAccount()], NAV)) })} />);
    expect(screen.getByText('Without Stocks & funds')).toBeInTheDocument();
  });
});

describe('InvestmentsOverview: desktop table', () => {
  it('is a card titled Your investments with a row per product, each opening its page', () => {
    render(<InvestmentsOverview cards={full()} />);
    expect(screen.getByText('Your investments')).toBeInTheDocument();
    const stocks = row('Stocks & funds');
    fireEvent.click(stocks);
    expect(router.push).toHaveBeenLastCalledWith('/investments/holdings');
    fireEvent.click(row('EPF'));
    expect(router.push).toHaveBeenLastCalledWith('/investments/epf');
    fireEvent.click(row('NPS Vatsalya'));
    expect(router.push).toHaveBeenLastCalledWith('/investments/nps?account=a2');
  });

  it('draws the stocks row: value with the day move, gain with its caption, share, prices date', () => {
    render(<InvestmentsOverview cards={full()} />);
    const stocks = within(row('Stocks & funds'));
    for (const text of ['1 holding', '₹6,38,208', '+₹3,566 today', '+₹1,44,909', '+29.4% · XIRR 24.1%', '29%', '13 Oct']) expect(stocks.getByText(text), text).toBeInTheDocument();
  });

  it('draws the EPF and NPS rows: interest, gain, shares and updated dates, the child not in net worth', () => {
    render(<InvestmentsOverview cards={full()} />);
    const epf = within(row('EPF'));
    for (const text of ['Northwind Labs', '₹8,43,210', '≈ ₹32,880', 'Interest so far', '39%', 'Sep 2026']) expect(epf.getByText(text), text).toBeInTheDocument();
    const own = within(row('NPS'));
    for (const text of ['PRAN ••7731', '₹5,94,880', '+₹1,44,880', '27%', '5 Nov']) expect(own.getByText(text), text).toBeInTheDocument();
    const kid = within(row('NPS Vatsalya'));
    for (const text of ['For Aarav · Not in net worth', '₹95,260', '+₹5,260', '4%', '31 Aug']) expect(kid.getByText(text), text).toBeInTheDocument();
  });

  it('tones a loss danger', () => {
    const loss = npsAccount({ tiers: [{ tier: 'I', value: 900, invested: 1000, gain: -100, schemes: [] }] });
    render(<InvestmentsOverview cards={overviewCards({ holdings: bad, epf: bad, employers: bad, nps: ok(npsSummary([loss], NAV)) })} />);
    expect(within(row('NPS')).getByText('−₹100').closest('[class*="text-danger"]')).not.toBeNull();
  });

  it('draws an empty product as its wording and an upload link, and the row does not open', () => {
    render(<InvestmentsOverview cards={overviewCards({ holdings: ok(holdingsResponse([])), epf: ok(epfSummary({ hasData: false })), employers: ok([]), nps: ok(npsSummary([])) })} />);
    const epf = row('EPF');
    expect(within(epf).getByText('Upload your EPFO passbook to see your balance here')).toBeInTheDocument();
    expect(within(epf).getByRole('link', { name: 'Upload passbook' })).toHaveAttribute('href', '/investments/import?type=epf');
    expect(within(row('Stocks & funds')).getByRole('link', { name: 'Import tradebook' })).toHaveAttribute('href', '/investments/import');
    fireEvent.click(epf);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("draws a failed product as Couldn't load with Retry, and the row does not open", () => {
    render(<InvestmentsOverview cards={overviewCards({ holdings: bad, epf: ok(epfSummary()), employers: ok([employer()]), nps: ok(npsSummary([npsAccount()], NAV)) })} />);
    const stocks = row('Stocks & funds');
    expect(within(stocks).getByText("Couldn't load")).toBeInTheDocument();
    fireEvent.click(within(stocks).getByRole('button', { name: 'Retry' }));
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('is hidden below desk', () => {
    render(<InvestmentsOverview cards={full()} />);
    expect(screen.getByRole('table').closest('.hidden')).toHaveClass('desk:block');
  });
});

describe('InvestmentsOverview: phone tiles', () => {
  const tiles = () => screen.getByTestId('overview-stocks').parentElement as HTMLElement;

  it('is a two-column grid shown only below desk, one tile per product linking to its page', () => {
    render(<InvestmentsOverview cards={full()} />);
    expect(tiles()).toHaveClass('grid', 'grid-cols-2', 'desk:hidden');
    expect(within(tiles()).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/investments/holdings', '/investments/epf', '/investments/nps?account=a1', '/investments/nps?account=a2']);
  });

  it('shows name, whole-rupee value, gain and the sub line', () => {
    render(<InvestmentsOverview cards={full()} />);
    const stocks = within(screen.getByTestId('overview-stocks'));
    for (const text of ['Stocks & funds', '₹6,38,208', '+₹1,44,909', '1 holding']) expect(stocks.getByText(text), text).toBeInTheDocument();
    expect(within(screen.getByTestId('overview-epf')).getByText('≈ ₹32,880 interest')).toBeInTheDocument();
    expect(within(screen.getByTestId('overview-nps-a2')).getByText('For Aarav')).toBeInTheDocument();
  });

  it('draws an empty tile as a label, its line and an upload link, not a tile link', () => {
    render(<InvestmentsOverview cards={overviewCards({ holdings: ok(holdingsResponse([holdingRow()])), epf: ok(epfSummary({ hasData: false })), employers: ok([]), nps: ok(npsSummary([])) })} />);
    expect(screen.queryByTestId('overview-epf')).toBeNull();
    expect(within(tiles()).getByRole('link', { name: 'Upload passbook' })).toHaveAttribute('href', '/investments/import?type=epf');
  });

  it('draws a failed tile as an error with Retry', () => {
    render(<InvestmentsOverview cards={overviewCards({ holdings: bad, epf: ok(epfSummary()), employers: ok([employer()]), nps: ok(npsSummary([])) })} />);
    expect(screen.getAllByText(/Couldn't load holdings/).length).toBeGreaterThan(0);
  });
});

describe('InvestmentsOverviewSkeleton', () => {
  it('has the hero, a table and tiles', () => {
    const { container } = render(<InvestmentsOverviewSkeleton />);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(6);
    expect(container.querySelector('.grid-cols-2')).toHaveClass('desk:hidden');
  });
});

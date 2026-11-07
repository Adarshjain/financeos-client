import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds/Conceal/Conceal';

import { employer, summary as epfSummary } from '../epf/epf.fixtures';
import { npsAccount, npsSummary } from './retirement.fixtures';
import { retirementModel } from './retirementModel';
import { RetirementScreen } from './RetirementScreen';

const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const child = npsAccount({ id: 'a2', relation: 'CHILD', sector: 'VATSALYA', holderName: 'Aarav', pranMasked: 'XXXXXXX5208', tier1Status: null, tiers: [{ tier: 'I', value: 95260, invested: 1, gain: 1, schemes: [] }] });
const full = () => retirementModel(epfSummary(), [employer()], npsSummary([npsAccount(), child], { a1: '2026-11-05', a2: '2026-08-31' }));

describe('RetirementScreen', () => {
  it('lists EPF, NPS and the child NPS with value and date, under the Retirement card', () => {
    render(<RetirementScreen model={full()} />);
    expect(screen.getByText('EPF passbook + NPS statements')).toBeInTheDocument();
    expect(screen.getAllByText('PRAN ••7731').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NPS Vatsalya').length).toBeGreaterThan(0);
    expect(screen.getAllByText('For Aarav').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹5,94,880').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sep 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('31/08/26').length).toBeGreaterThan(0);
  });

  it('shows the total in the hero', () => {
    render(<RetirementScreen model={full()} />);
    expect(screen.getByText('Retirement value')).toBeInTheDocument();
    expect(screen.getByText('₹15,33,350')).toBeInTheDocument();
  });

  it('opens the screen of a row', () => {
    render(<RetirementScreen model={full()} />);
    fireEvent.click(screen.getAllByText('NPS Vatsalya')[0]);
    expect(router.push).toHaveBeenCalledWith('/investments/retirement/nps?account=a2');
  });

  it('shows an upload link per missing EPF and NPS, with no hero', () => {
    render(<RetirementScreen model={retirementModel(epfSummary({ hasData: false }), [], npsSummary([]))} />);
    expect(screen.getAllByRole('link', { name: 'Upload passbook' })[0]).toHaveAttribute('href', '/investments/import?type=epf');
    expect(screen.getAllByRole('link', { name: 'Upload statement' })[0]).toHaveAttribute('href', '/investments/import?type=nps');
    expect(screen.queryByText('Retirement value')).toBeNull();
  });

  it('keeps an upload link for the missing half when the other is there', () => {
    render(<RetirementScreen model={retirementModel(epfSummary(), [employer()], npsSummary([]))} />);
    expect(screen.getAllByText('₹8,43,210').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Upload statement' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Upload passbook' })).toBeNull();
  });

  it('shows the status words the data can tell', () => {
    const model = retirementModel(epfSummary({ staleThrough: '2026-06-01' }), [employer()], npsSummary([npsAccount({ tier1Status: 'FROZEN' })]));
    render(<RetirementScreen model={model} />);
    expect(screen.getAllByText('Update passbook').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Frozen').length).toBeGreaterThan(0);
  });

  it('hides amounts when the hide-amounts switch is on, keeping the dates', () => {
    render(
      <ConcealProvider concealed>
        <RetirementScreen model={full()} />
      </ConcealProvider>,
    );
    expect(screen.queryByText('₹5,94,880')).toBeNull();
    expect(screen.queryByText('₹15,33,350')).toBeNull();
    expect(screen.getAllByText('₹ —').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sep 2026').length).toBeGreaterThan(0);
  });
});

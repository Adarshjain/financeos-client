import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { kpi, rawTable, widget } from '@/features/dashboards/builtins/testFixtures';
import type { ReportData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CapHeadroomView } from './CapHeadroomView';

const view = (data: ReportData) => ({ widget: widget('cap_headroom'), data, onPageChange: vi.fn() });

const COLS = ['card', 'cap', 'cardholder', 'unit', 'used', 'capLimit', 'utilizationPct', 'windowEnd'];
const caps = rawTable(COLS, [
  { id: 'k1', card: 'Atlas', cardId: 'c1', cap: 'Travel', cardholder: 'All cardholders', unit: 'POINTS', used: 4000, capLimit: 10000, utilizationPct: 40, windowEnd: '2026-10-31' },
  { id: 'k2', card: 'Millennia', cardId: 'c2', cap: 'Cashback', cardholder: 'Asha', unit: 'RUPEES', used: 900, capLimit: 1000, utilizationPct: 90, windowEnd: '2026-10-31' },
  { id: 'k3', card: 'Regalia', cardId: 'c3', cap: 'Dining', cardholder: 'All cardholders', unit: 'RUPEES', used: 1500, capLimit: 1500, utilizationPct: 100, windowEnd: '2026-10-31' },
]);

describe('CapHeadroomView', () => {
  it('most used first, with the tone: nothing special under 80%, amber to 99%, "Cap hit" at 100%', () => {
    renderWithQuery(<CapHeadroomView {...view(caps)} />);
    const rows = screen.getAllByTestId('cap-row');
    expect(rows.map((r) => r.getAttribute('data-tone'))).toEqual(['hit', 'near', 'neutral']);
    expect(within(rows[0]).getByText('Cap hit')).toBeInTheDocument();
    expect(within(rows[1]).getByText('90%')).toBeInTheDocument();
    expect(within(rows[2]).getByText('40%')).toBeInTheDocument();
  });

  it('names the card, the cap and a named cardholder; amounts in the cap\'s unit; when the window resets; links to the card on Rewards', () => {
    renderWithQuery(<CapHeadroomView {...view(caps)} />);
    const [, millennia, atlas] = screen.getAllByTestId('cap-row');
    expect(millennia).toHaveTextContent('Millennia · Cashback · Asha');
    expect(millennia).toHaveTextContent('₹900 of ₹1,000 · resets after 31 Oct');
    expect(atlas).toHaveTextContent('Atlas · Travel');
    expect(atlas).not.toHaveTextContent('All cardholders');
    expect(atlas).toHaveTextContent('4,000 pts of 10,000 pts');
    expect(atlas.closest('a') ?? within(atlas).getByRole('link')).toHaveAttribute('href', expect.stringMatching(/\/rewards\?account=c1$/));
  });

  it('empty: no reward caps this cycle', () => {
    renderWithQuery(<CapHeadroomView {...view(rawTable(COLS, []))} />);
    expect(screen.getByText("Caps on your cards' reward rules show up here as you spend.")).toBeInTheDocument();
  });

  it('data of another shape is not drawn', () => {
    renderWithQuery(<CapHeadroomView {...view(kpi(1))} />);
    expect(screen.getByText("This widget can't show this data.")).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '@/components/ds/Conceal/Conceal';
import { KpiTile } from '@/components/ds/KpiTile/KpiTile';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';

import { TransactionRow } from './TransactionRow';

const wrap = (concealed: boolean, ui: React.ReactNode) => <ConcealProvider concealed={concealed}>{ui}</ConcealProvider>;

describe('hidden amounts in Dinero components', () => {
  it('TransactionRow shows "₹ —" for the amount and drops the balance line', () => {
    render(wrap(true, <TransactionRow description="Uber Ride" amount="1,250.00" balance="₹80,806" />));
    expect(screen.queryByText(/1,250/)).toBeNull();
    expect(screen.queryByText(/80,806/)).toBeNull();
    // Only the amount reads "₹ —": no line under it and the desktop Balance column is blank.
    expect(screen.getAllByText('₹ —')).toHaveLength(1);
    expect(screen.getByText('₹ —').closest('[role="cell"]')?.querySelector('div')).toBeNull();
  });

  it('TransactionRow keeps a credit out of green while hidden', () => {
    const { container, rerender } = render(wrap(false, <TransactionRow description="Salary" amount="+50,000.00" isCredit />));
    expect(container.querySelector('.text-positive')).not.toBeNull();
    rerender(wrap(true, <TransactionRow description="Salary" amount="+50,000.00" isCredit />));
    expect(container.querySelector('.text-positive')).toBeNull();
  });

  it('TransactionRow shows amount and balance when amounts are shown', () => {
    render(wrap(false, <TransactionRow description="Uber Ride" amount="1,250.00" balance="₹80,806" />));
    expect(screen.getByText(/1,250/)).toBeInTheDocument();
    expect(screen.getAllByText('₹80,806').length).toBeGreaterThan(0);
  });

  it('Text with fraction hides a bare amount; a ₹ string keeps its other words', () => {
    render(
      wrap(
        true,
        <>
          <Text fraction="small">3,600.00</Text>
          <Text>Due ₹500 on 12 Oct</Text>
        </>,
      ),
    );
    expect(screen.getByText('₹ —')).toBeInTheDocument();
    expect(screen.getByText('Due ₹ — on 12 Oct')).toBeInTheDocument();
  });

  it('Text with fraction still splits the paise when shown', () => {
    const { container } = render(wrap(false, <Text fraction="small">3,600.00</Text>));
    expect(container.querySelector('[data-fraction]')).toHaveTextContent('.00');
  });

  it('KpiTile hides the value, delta and context amounts and leaves a percentage', () => {
    render(
      wrap(
        true,
        <>
          <KpiTile label="Net worth" value="₹5,22,238" delta={{ value: '▲ ₹41,220', period: 'this month' }} context="of ₹1.55L · 18 days left" />
          <KpiTile label="Used" value="62%" />
        </>,
      ),
    );
    expect(screen.getByText('₹ —')).toBeInTheDocument();
    expect(screen.getByText('▲ ₹ —')).toBeInTheDocument();
    expect(screen.getByText('of ₹ — · 18 days left')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
  });

  it('ListRow hides amounts in its title, subtitle and trailing text', () => {
    render(wrap(true, <ListRow title="Rent ₹36,000" subtitle="Paid ₹1,000" trailing="₹500" />));
    expect(screen.getByText('Rent ₹ —')).toBeInTheDocument();
    expect(screen.getByText('Paid ₹ —')).toBeInTheDocument();
    expect(screen.getByText('₹ —')).toBeInTheDocument();
  });
});

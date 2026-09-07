import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ObligationRefBadges } from '@/components/transactions/ObligationRefBadges';
import type { ObligationRef } from '@/lib/transaction.types';

const lendingRef: ObligationRef = {
  kind: 'LENDING',
  id: 'ref-1',
  parentId: 'cp-1',
  label: 'Rahul Sharma',
  amount: 500,
};

const loanPaymentRef: ObligationRef = {
  kind: 'LOAN_PAYMENT',
  id: 'ref-2',
  parentId: 'loan-1',
  label: 'Home Loan #3',
};

const loanEventRef: ObligationRef = {
  kind: 'LOAN_EVENT',
  id: 'ref-3',
  parentId: 'loan-2',
  label: 'Rate change',
};

const loanChargeRef: ObligationRef = {
  kind: 'LOAN_CHARGE',
  id: 'ref-4',
  parentId: 'loan-3',
  label: 'Processing fee',
};

describe('ObligationRefBadges', () => {
  it('renders nothing when refs is undefined', () => {
    const { container } = render(<ObligationRefBadges />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when refs is an empty array', () => {
    const { container } = render(<ObligationRefBadges refs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a badge with the ref label for each ref', () => {
    render(<ObligationRefBadges refs={[lendingRef, loanPaymentRef]} />);
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('Home Loan #3')).toBeInTheDocument();
  });

  it('links a LENDING ref to /loans/lendings/{parentId}', () => {
    render(<ObligationRefBadges refs={[lendingRef]} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/loans/lendings/cp-1');
  });

  it.each([
    ['LOAN_PAYMENT', loanPaymentRef],
    ['LOAN_EVENT', loanEventRef],
    ['LOAN_CHARGE', loanChargeRef],
  ])('links a %s ref to /loans/{parentId}', (_kind, ref) => {
    render(<ObligationRefBadges refs={[ref]} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', `/loans/${ref.parentId}`);
  });

  it('renders the badge without a link when parentId is missing', () => {
    const noParent: ObligationRef = { ...lendingRef, parentId: null };
    render(<ObligationRefBadges refs={[noParent]} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
  });

  it('stops a badge click from propagating to a wrapping onClick handler', () => {
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <ObligationRefBadges refs={[lendingRef]} />
      </div>,
    );

    fireEvent.click(screen.getByText('Rahul Sharma'));

    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('uses a different icon for LENDING (HandCoins) vs other kinds (Landmark)', () => {
    const { container } = render(<ObligationRefBadges refs={[lendingRef, loanPaymentRef]} />);
    expect(container.querySelector('.lucide-hand-coins')).toBeInTheDocument();
    expect(container.querySelector('.lucide-landmark')).toBeInTheDocument();
  });
});

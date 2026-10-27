import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { DividendReceiptStatus } from '@/lib/types';

import { ReceiptStatusBadge } from '../ReceiptStatusBadge';

const CASES: [DividendReceiptStatus, string, string, string | null][] = [
  ['received', 'Received', 'text-emerald-700', null],
  ['received_untracked', 'Received (untracked)', 'bg-transparent', null],
  ['awaiting', 'Awaiting', 'text-sky-700', 'Payout window still open'],
  ['overdue', 'Overdue', 'text-amber-700', 'Payout window passed and your bank data covers it'],
  ['not_received', 'Not received', 'text-rose-700', null],
  [
    'unverifiable',
    'No bank data',
    'text-slate-600',
    'Window passed but no tracked bank account has transactions that late',
  ],
];

describe('ReceiptStatusBadge', () => {
  it.each(CASES)('%s renders label, tone and tooltip', (status, label, toneClass, title) => {
    render(<ReceiptStatusBadge status={status} />);
    const badge = screen.getByText(label);
    expect(badge).toHaveClass(toneClass, 'text-2xs');
    if (title) expect(badge).toHaveAttribute('title', title);
    else expect(badge).not.toHaveAttribute('title');
  });

  it('renders nothing without a status (legacy rows)', () => {
    const { container } = render(<ReceiptStatusBadge status={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

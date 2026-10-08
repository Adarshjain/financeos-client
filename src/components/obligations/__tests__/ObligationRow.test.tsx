import '@/test/next-mocks';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { formatDate, formatMoney } from '@/lib/utils';

import { obligationHref, ObligationRow, obligationTitle } from '../ObligationRow';
import type { ObligationItem } from '../types';

const item = (o: Partial<ObligationItem>): ObligationItem =>
  ({ type: 'emi', status: 'upcoming', date: '2026-10-20', amount: 1500, ...o }) as ObligationItem;

describe('obligationTitle', () => {
  it('prefers the server title', () => {
    expect(obligationTitle(item({ title: 'HDFC bill', loanName: 'X' }))).toBe('HDFC bill');
  });
  it('builds an EMI title from loan name and sequence', () => {
    expect(obligationTitle(item({ loanName: 'Home loan', installmentSeq: 4 }))).toBe('Home loan · EMI #4');
  });
  it('labels a lent lending as Receivable and a borrowed one as Payable', () => {
    expect(obligationTitle(item({ type: 'lending_due', counterpartyName: 'Ravi', direction: 'lent' }))).toBe('Ravi (Receivable)');
    expect(obligationTitle(item({ type: 'lending_due', counterpartyName: 'Ravi', direction: 'borrowed' }))).toBe('Ravi (Payable)');
  });
});

describe('obligationHref', () => {
  it('links an EMI to its loan with the installment', () => {
    expect(obligationHref(item({ loanId: 'L1', installmentSeq: 3 }))).toBe('/loans/L1?installment=3');
  });
  it('links an EMI without a sequence to the bare loan', () => {
    expect(obligationHref(item({ loanId: 'L1' }))).toBe('/loans/L1');
  });
  it('links a lending to its counterparty', () => {
    expect(obligationHref(item({ type: 'lending_due', counterpartyId: 'C1' }))).toBe('/loans/lendings/C1');
  });
  it('uses the server href for other kinds and null when absent', () => {
    expect(obligationHref(item({ type: 'card_bill', href: '/upcoming?bill=S1' }))).toBe('/upcoming?bill=S1');
    expect(obligationHref(item({ type: 'card_bill' }))).toBeNull();
  });
  it('falls back to server href when an EMI has no loan id', () => {
    expect(obligationHref(item({ loanId: undefined, href: '/x' }))).toBe('/x');
  });
});

describe('ObligationRow', () => {
  it('shows title, formatted date, days text, account and amount', () => {
    render(<ObligationRow item={item({ title: 'T', daysUntil: 5, accountName: 'HDFC' })} />);
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText(formatDate('2026-10-20'))).toBeInTheDocument();
    expect(screen.getByText(/in 5 days/)).toBeInTheDocument();
    expect(screen.getByText(/HDFC/)).toBeInTheDocument();
    expect(screen.getByText(formatMoney(1500))).toBeInTheDocument();
  });

  it('days text: today, singular, overdue plural and overdue singular', () => {
    const { rerender } = render(<ObligationRow item={item({ title: 'T', daysUntil: 0 })} />);
    expect(screen.getByText(/· today/)).toBeInTheDocument();
    rerender(<ObligationRow item={item({ title: 'T', daysUntil: 1 })} />);
    expect(screen.getByText(/in 1 day$/)).toBeInTheDocument();
    rerender(<ObligationRow item={item({ title: 'T', daysUntil: -3, status: 'overdue' })} />);
    expect(screen.getByText(/3 days overdue/)).toBeInTheDocument();
    rerender(<ObligationRow item={item({ title: 'T', daysUntil: -1, status: 'overdue' })} />);
    expect(screen.getByText(/1 day overdue/)).toBeInTheDocument();
  });

  it('omits days text when daysUntil is null', () => {
    render(<ObligationRow item={item({ title: 'T', daysUntil: null })} />);
    expect(screen.queryByText(/overdue|in \d+ day|today/)).toBeNull();
  });

  it('renders an em dash for a null amount', () => {
    render(<ObligationRow item={item({ title: 'T', amount: null })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows "Due date unknown" when undated', () => {
    render(<ObligationRow item={item({ title: 'T', date: null })} />);
    expect(screen.getByText('Due date unknown')).toBeInTheDocument();
  });

  it('status pill: Overdue, Due soon, and a type label otherwise', () => {
    const { rerender } = render(<ObligationRow item={item({ title: 'T', status: 'overdue' })} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    rerender(<ObligationRow item={item({ title: 'T', status: 'due_soon' })} />);
    expect(screen.getByText('Due soon')).toBeInTheDocument();
    const labels: Record<string, string> = { emi: 'Loan EMI', lending_due: 'Lending', card_bill: 'Card bill', statement_expected: 'Statement' };
    for (const [type, label] of Object.entries(labels)) {
      rerender(<ObligationRow item={item({ title: 'T', type: type as never, status: 'upcoming' })} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('Open chevron links to the resolved href; absent without one', () => {
    const { rerender } = render(<ObligationRow item={item({ title: 'T', loanId: 'L1', installmentSeq: 2 })} />);
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/loans/L1?installment=2');
    rerender(<ObligationRow item={item({ title: 'T', type: 'card_bill' })} />);
    expect(screen.queryByRole('link', { name: 'Open' })).toBeNull();
  });

  it('statement_expected shows an Upload link with ?account= only when it has an account', () => {
    const { rerender } = render(<ObligationRow item={item({ title: 'T', type: 'statement_expected', accountId: 'A1' })} />);
    expect(screen.getByRole('link', { name: 'Upload' })).toHaveAttribute('href', '/transactions/import?account=A1');
    rerender(<ObligationRow item={item({ title: 'T', type: 'statement_expected' })} />);
    expect(screen.queryByRole('link', { name: 'Upload' })).toBeNull();
    rerender(<ObligationRow item={item({ title: 'T', type: 'emi', accountId: 'A1' })} />);
    expect(screen.queryByRole('link', { name: 'Upload' })).toBeNull();
  });

  it('Mark paid appears for card bills with a statement and a handler, and fires with the statement id', async () => {
    const onMarkPaid = vi.fn();
    const { rerender } = render(
      <ObligationRow item={item({ title: 'T', type: 'card_bill', statementId: 'S1' })} onMarkPaid={onMarkPaid} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mark paid' }));
    expect(onMarkPaid).toHaveBeenCalledWith('S1');

    rerender(<ObligationRow item={item({ title: 'T', type: 'card_bill', statementId: 'S1' })} />);
    expect(screen.queryByRole('button', { name: 'Mark paid' })).toBeNull();
    rerender(<ObligationRow item={item({ title: 'T', type: 'card_bill' })} onMarkPaid={onMarkPaid} />);
    expect(screen.queryByRole('button', { name: 'Mark paid' })).toBeNull();
    rerender(<ObligationRow item={item({ title: 'T', type: 'emi', statementId: 'S1' })} onMarkPaid={onMarkPaid} />);
    expect(screen.queryByRole('button', { name: 'Mark paid' })).toBeNull();
  });

  it('tags card-bill rows with data-bill-row for scroll-to, and highlights', () => {
    const { container } = render(
      <ObligationRow item={item({ title: 'T', type: 'card_bill', statementId: 'S9' })} highlighted />
    );
    const row = container.querySelector('[data-bill-row="S9"]') as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.className).toContain('ring-emerald-300');
  });

  it('non-card rows carry no data-bill-row', () => {
    const { container } = render(<ObligationRow item={item({ title: 'T', statementId: 'S9' })} />);
    expect(container.querySelector('[data-bill-row]')).toBeNull();
  });
});

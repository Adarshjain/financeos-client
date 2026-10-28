import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/loans/l1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [{ id: 'b1', type: 'bank_account', name: 'HDFC Bank Savings' }] }),
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const m = vi.hoisted(() => {
  const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    addPayment: mutation(),
    addPaymentsBatch: mutation(),
    deletePayment: mutation(),
    addEvent: mutation(),
    deleteEvent: mutation(),
    addCharge: mutation(),
    deleteCharge: mutation(),
    closeLoan: mutation(),
    reopenLoan: mutation(),
    deleteLoan: mutation(),
  };
});
vi.mock('../useLoanMutations', () => ({ useLoanMutations: () => m }));

const loadLoanMatches = vi.hoisted(() => vi.fn());
vi.mock('./matchActions', () => ({ loadLoanMatches }));

import { api } from '@/lib/api/client';
import type { InstallmentDto } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';
import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

import {
  chargeFixture,
  detailFixture,
  installment,
  loanFixture,
  scheduleFixture,
  TODAY,
} from './loanDetail.fixtures';
import { LoanDetailView, type LoanDetailViewProps } from './LoanDetailView';

pinClock();

type Mock = ReturnType<typeof vi.fn>;
const user = userEvent.setup({ pointerEventsCheck: 0 });

function renderView(props: Partial<LoanDetailViewProps> = {}) {
  return renderWithQuery(
    <LoanDetailView
      detail={detailFixture()}
      schedule={scheduleFixture()}
      paymentAccountName="HDFC Bank Savings"
      today={TODAY}
      highlightSeq={null}
      {...props}
    />,
  );
}

const debit = (id = 't1') =>
  ({ id, date: '2026-10-05', amount: -39052, description: 'SBI Home Loan EMI', accountId: 'b1' }) as Transaction;

/** The Add dropdown of the Events & charges card (the top bar + is the other Add). */
const cardAdd = () => screen.getAllByRole('button', { name: 'Add' }).find((b) => b.getAttribute('aria-haspopup') === 'menu')!;
const topBarAdd = () => screen.getAllByRole('button', { name: 'Add' }).find((b) => b.getAttribute('aria-haspopup') == null)!;
/** The pressable schedule row whose Due cell reads `due`. */
const rowOf = (due: string) => screen.getAllByRole('button').find((b) => b.getAttribute('role') === 'button' && within(b).queryByText(due))!;
const openMenu = async (name: string) => user.click(screen.getAllByRole('button', { name })[0]);

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(m) as (keyof typeof m)[]) {
    m[key].mutateAsync.mockResolvedValue({ id: 'new1', created: 1 });
    m[key].isPending = false;
  }
  loadLoanMatches.mockResolvedValue({ success: true, data: { suggestions: [] } });
  (api.POST as Mock).mockResolvedValue({ data: { content: [], number: 0, size: 50, totalElements: 0, totalPages: 0 } });
});

describe('header', () => {
  it('shows the status and rate words and the loan particulars on the top bar page', () => {
    renderView();
    expect(screen.getAllByText('Home Loan · SBI MaxGain').length).toBeGreaterThan(0);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Floating 8.25%')).toBeInTheDocument();
    expect(
      screen.getByText('State Bank of India · #SBIHL00482913 · started 1 Aug 2025 · ends January 2045 · paid from HDFC Bank Savings'),
    ).toBeInTheDocument();
  });

  it('puts the overdue EMI on the right', () => {
    renderView({ today: '2026-10-13' });
    expect(screen.getByText('EMI #14 overdue')).toBeInTheDocument();
    expect(screen.getByText('was due 5 Oct · 8 days ago')).toBeInTheDocument();
    expect(screen.getAllByText('₹36,603').length).toBeGreaterThan(0);
  });

  it('shows the four figures, the timeline and the words under them', () => {
    renderView();
    for (const label of ['Outstanding', 'Current EMI', 'Interest paid', 'Timeline']) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('₹41,92,327')).toBeInTheDocument();
    expect(screen.getByText('of ₹45,00,000 · 6.8% repaid')).toBeInTheDocument();
    expect(screen.getByText('was ₹39,052 before the rate cut')).toBeInTheDocument();
    expect(screen.getByText('effective APR 8.72%')).toBeInTheDocument();
    expect(screen.getByText('13 / 233')).toBeInTheDocument();
    expect(screen.getByText('7 months saved by prepayment')).toBeInTheDocument();
    expect(screen.getByText('August 2025')).toBeInTheDocument();
    expect(screen.getByText('Today · EMI 13 settled')).toBeInTheDocument();
    expect(screen.getByText('January 2045')).toBeInTheDocument();
  });

  it('leaves out the words that do not apply', () => {
    renderView({
      detail: detailFixture({
        loan: loanFixture({ currentEmi: 39052, totalInstallments: 240, effectiveAprPct: null }),
        events: [],
      }),
    });
    expect(screen.queryByText(/before the/)).toBeNull();
    expect(screen.queryByText(/saved by prepayment/)).toBeNull();
    expect(screen.queryByText(/effective APR/)).toBeNull();
  });

  it('shows the interest-vs-principal card with one row per financial year', () => {
    renderView();
    expect(screen.getByText('Interest vs principal')).toBeInTheDocument();
    expect(screen.getByText('Per financial year')).toBeInTheDocument();
    expect(screen.getByText('₹2.22L · 6 EMIs')).toBeInTheDocument();
    expect(screen.getByText('₹36,603 · 1 EMI')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-segment="interest"]').length).toBe(2);
  });

  it('hides the card for a loan with no installments', () => {
    renderView({ schedule: [] });
    expect(screen.queryByText('Interest vs principal')).toBeNull();
  });
});

describe('schedule', () => {
  it('opens on the current financial year with its summary line', () => {
    renderView();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('FY 26-27 · 6 EMIs · principal ₹46,368 · interest ₹1,73,250')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FY 26-27' })).toBeInTheDocument();
    for (const header of ['#', 'Due', 'Opening', 'EMI', 'Interest', 'Principal', 'Closing', 'Status']) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
  });

  it('says Paid, Overdue n d, In n d and Upcoming', () => {
    renderView({ today: '2026-10-13' });
    expect(screen.getAllByText('Paid')).toHaveLength(3);
    expect(screen.getByText('Overdue 8 d')).toBeInTheDocument();
    expect(screen.getByText('In 23 d')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('changes financial year from the Select', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'FY 26-27' }));
    await user.click(await screen.findByRole('option', { name: 'FY 27-28' }));
    expect(screen.getByText('FY 27-28 · 1 EMI · principal ₹7,728 · interest ₹28,875')).toBeInTheDocument();
    expect(screen.queryByText('Overdue 8 d')).toBeNull();
  });

  it('opens on the year of ?installment=N', () => {
    renderView({ highlightSeq: 17 });
    expect(screen.getByRole('button', { name: 'FY 27-28' })).toBeInTheDocument();
    expect(screen.getByText('FY 27-28 · 1 EMI · principal ₹7,728 · interest ₹28,875')).toBeInTheDocument();
  });

  it('puts prepayments and rate changes in the table at their dates', () => {
    renderView();
    expect(screen.getByText('1 Aug · Rate 8.5% → 8.25% · EMI reduced to ₹36,603')).toBeInTheDocument();
    expect(screen.getByText('1 Jun · Prepayment ₹2,00,000 · tenure reduced')).toBeInTheDocument();
  });

  it('has no buttons column: only the overdue row keeps a Mark paid button, and no Unlink button', () => {
    renderView();
    expect(screen.getAllByRole('button', { name: 'Mark paid' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Unlink' })).toBeNull();
  });

  it('has no Export and no Show all', () => {
    renderView();
    expect(screen.queryByText(/Export/)).toBeNull();
    expect(screen.queryByText(/Show all/)).toBeNull();
  });

  it('pressing a linked paid row opens its EMI dialog; Unlink unlinks with a Toast that has Undo', async () => {
    renderView();
    await user.click(rowOf('5 Sep'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('EMI #13')).toBeInTheDocument();
    expect(within(dialog).getByText('Paid ₹36,603 on 5 Sep 2026')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Unlink' }));
    await waitFor(() => expect(m.deletePayment.mutateAsync).toHaveBeenCalledWith('p13'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Payment unlinked', expect.objectContaining({ action: expect.anything() })));
    await waitFor(() => expect(screen.queryByText('EMI #13')).toBeNull());
  });

  it('a paid row with no linked payment is not pressable', async () => {
    const schedule = scheduleFixture().map((i) => (i.seq === 13 ? { ...i, payment: undefined } : i));
    renderView({ schedule });
    const row = screen.getAllByRole('row').find((r) => within(r).queryByText('5 Sep'))!;
    expect(row).not.toHaveAttribute('tabindex');
    await user.click(row);
    expect(screen.queryByRole('dialog')).toBeNull();
    // The linked paid rows next to it still are.
    expect(rowOf('5 Aug')).toBeInTheDocument();
  });
});

describe('Mark paid', () => {
  it('pressing an unpaid row opens the form for that EMI', async () => {
    renderView();
    await user.click(rowOf('5 Nov'));
    expect(await screen.findByText('Mark EMI #15 paid')).toBeInTheDocument();
  });

  it('the overdue row button opens the form once', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'Mark paid' }));
    expect(await screen.findAllByText('Mark EMI #14 paid')).toHaveLength(1);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(loadLoanMatches).toHaveBeenCalledTimes(1);
  });

  it('opens the form for that EMI and looks for the debit', async () => {
    loadLoanMatches.mockResolvedValue({
      success: true,
      data: { suggestions: [{ installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 36603, candidates: [debit()] }] },
    });
    renderView();
    await user.click(screen.getAllByRole('button', { name: 'Mark paid' })[0]);
    expect(await screen.findByText('Mark EMI #14 paid')).toBeInTheDocument();
    expect(loadLoanMatches).toHaveBeenCalledWith('l1');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark paid & link' })).toBeInTheDocument());
    expect(screen.getByText('₹2,449 more than EMI')).toBeInTheDocument();
  });

  it('saves, closes and says so with Undo', async () => {
    renderView();
    await user.click(screen.getAllByRole('button', { name: 'Mark paid' })[0]);
    await screen.findByText('Mark EMI #14 paid');
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark paid' }));
    await waitFor(() =>
      expect(m.addPayment.mutateAsync).toHaveBeenCalledWith({
        installmentSeq: 14,
        paymentDate: '2026-10-05',
        amount: 36603,
        transactionId: undefined,
      }),
    );
    await waitFor(() => expect(screen.queryByText('Mark EMI #14 paid')).toBeNull());
    expect(toast).toHaveBeenCalledWith('Installment #14 marked as paid', expect.objectContaining({ action: expect.anything() }));
  });
});

describe('events and charges', () => {
  it('lists the events and charges as drawn', () => {
    renderView();
    expect(screen.getByText('Events & charges')).toBeInTheDocument();
    expect(screen.getByText('4 entries')).toBeInTheDocument();
    expect(screen.getByText('Rate change · 8.25%')).toBeInTheDocument();
    expect(screen.getByText('1 Aug · reduce EMI')).toBeInTheDocument();
    expect(screen.getByText('Prepayment')).toBeInTheDocument();
    expect(screen.getByText('₹2,00,000')).toBeInTheDocument();
    expect(screen.getByText('Insurance premium')).toBeInTheDocument();
    expect(screen.getByText('1 Aug 2025 · SBI Life RiNn Raksha')).toBeInTheDocument();
    expect(screen.getByText('Processing fee')).toBeInTheDocument();
  });

  it('offers Rate change, Prepayment, Foreclosure and Charge from Add', async () => {
    renderView();
    await user.click(cardAdd());
    for (const name of ['Rate change', 'Prepayment', 'Foreclosure', 'Charge']) {
      expect(await screen.findByRole('menuitem', { name })).toBeInTheDocument();
    }
  });

  it('Add > Foreclosure opens the event form on foreclosure', async () => {
    renderView();
    await user.click(cardAdd());
    await user.click(await screen.findByRole('menuitem', { name: 'Foreclosure' }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('combobox', { name: /Event type/ })).toHaveTextContent('Foreclosure');
  });

  it('Add > Charge opens the charge form', async () => {
    renderView();
    await user.click(cardAdd());
    await user.click(await screen.findByRole('menuitem', { name: 'Charge' }));
    expect(await screen.findByRole('button', { name: 'Add charge' })).toBeInTheDocument();
  });

  it('asks before deleting an event, and deletes nothing until confirmed', async () => {
    renderView();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[1]);
    await user.click(await screen.findByRole('menuitem', { name: 'Delete event' }));
    expect(await screen.findByText('Removes Prepayment, 1 Jun · reduce tenure.')).toBeInTheDocument();
    expect(screen.getByText('A linked bank transaction stays; only the link goes.')).toBeInTheDocument();
    expect(m.deleteEvent.mutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(m.deleteEvent.mutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByText('Removes Prepayment, 1 Jun · reduce tenure.')).toBeNull();
  });

  it('deletes the event once confirmed', async () => {
    renderView();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[1]);
    await user.click(await screen.findByRole('menuitem', { name: 'Delete event' }));
    await user.click(await screen.findByRole('button', { name: 'Delete event' }));
    await waitFor(() => expect(m.deleteEvent.mutateAsync).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(screen.queryByText(/^Removes Prepayment/)).toBeNull());
  });

  it('keeps the confirmation open when the server refuses the delete', async () => {
    m.deleteEvent.mutateAsync.mockRejectedValue(new Error('Cannot delete event: settled payment exists'));
    renderView();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[1]);
    await user.click(await screen.findByRole('menuitem', { name: 'Delete event' }));
    await user.click(await screen.findByRole('button', { name: 'Delete event' }));
    await waitFor(() => expect(m.deleteEvent.mutateAsync).toHaveBeenCalled());
    expect(screen.getByText(/^Removes Prepayment/)).toBeInTheDocument();
  });

  it('asks before deleting a charge and deletes it once confirmed', async () => {
    renderView({ detail: detailFixture({ charges: [chargeFixture()] }) });
    await user.click(screen.getAllByRole('button', { name: 'More options' }).at(-1)!);
    await user.click(await screen.findByRole('menuitem', { name: 'Delete charge' }));
    expect(await screen.findByText('Removes Insurance premium of ₹24,500, 1 Aug 2025 · SBI Life RiNn Raksha.')).toBeInTheDocument();
    expect(m.deleteCharge.mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete charge' }));
    await waitFor(() => expect(m.deleteCharge.mutateAsync).toHaveBeenCalledWith('c1'));
  });

  it('says there is nothing yet when there are no entries', () => {
    renderView({ detail: detailFixture({ events: [], charges: [] }) });
    expect(screen.getByText('No entries yet')).toBeInTheDocument();
  });
});

describe('matching', () => {
  const emi14: InstallmentDto = installment(14, '2026-10-05', { status: 'overdue' });

  it('says how many paid EMIs are linked', () => {
    renderView();
    expect(screen.getByText('EMIs ↔ bank debits')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 paid EMIs')).toBeInTheDocument();
  });

  it('finds matches and links one with Undo', async () => {
    loadLoanMatches.mockResolvedValue({
      success: true,
      data: { suggestions: [{ installmentSeq: emi14.seq, dueDate: emi14.dueDate, expectedAmount: 36603, candidates: [debit()] }] },
    });
    renderView();
    await user.click(screen.getByRole('button', { name: 'Find matches' }));
    expect(await screen.findByText(/#14 "SBI Home Loan EMI" 5 Oct · ₹39,052/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm all' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'link' }));
    await waitFor(() =>
      expect(m.addPayment.mutateAsync).toHaveBeenCalledWith({
        installmentSeq: 14,
        paymentDate: '2026-10-05',
        amount: 39052,
        transactionId: 't1',
      }),
    );
    expect(toast).toHaveBeenCalledWith('Matched installment #14', expect.objectContaining({ action: expect.anything() }));
  });

  it('confirms all in one batch', async () => {
    loadLoanMatches.mockResolvedValue({
      success: true,
      data: { suggestions: [{ installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 36603, candidates: [debit()] }] },
    });
    renderView();
    await user.click(screen.getByRole('button', { name: 'Find matches' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm all' }));
    await waitFor(() => expect(m.addPaymentsBatch.mutateAsync).toHaveBeenCalled());
  });

  it('says so when no debit matches', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'Find matches' }));
    expect(await screen.findByText('No matching bank transactions found for due or overdue installments.')).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith('No matching bank transactions found (±7 days)');
  });
});

describe('Prepay, the top bar + and the menu', () => {
  it('Prepay opens the event form on a prepayment', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'Prepay' }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('combobox', { name: /Event type/ })).toHaveTextContent('Prepayment');
  });

  it('the top bar + opens the event form, as Legacy Add Event does', async () => {
    renderView();
    await user.click(topBarAdd());
    await screen.findByRole('dialog');
    expect(screen.getByRole('combobox', { name: /Event type/ })).toHaveTextContent('Rate change');
  });

  it('records a prepayment with the typed amount', async () => {
    renderView();
    await user.click(screen.getByRole('button', { name: 'Prepay' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '100000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record event' }));
    await waitFor(() =>
      expect(m.addEvent.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'prepayment', amount: 100000, adjustmentMode: 'reduce_tenure' }),
      ),
    );
  });

  it('shows no Prepay on a closed loan, and Reopen instead of Close', async () => {
    renderView({ detail: detailFixture({ loan: loanFixture({ status: 'closed' }) }) });
    expect(screen.queryByRole('button', { name: 'Prepay' })).toBeNull();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    await openMenu('More actions');
    expect(await screen.findByRole('menuitem', { name: 'Reopen loan' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Close loan' })).toBeNull();
  });

  it('the menu closes the loan with Undo', async () => {
    renderView();
    await openMenu('More actions');
    await user.click(await screen.findByRole('menuitem', { name: 'Close loan' }));
    await waitFor(() => expect(m.closeLoan.mutateAsync).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Loan closed', expect.objectContaining({ action: expect.anything() }));
  });

  it('Delete asks first, saying what goes and what stays', async () => {
    renderView();
    await openMenu('More actions');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete loan' }));
    expect(await screen.findByText('Delete "Home Loan · SBI MaxGain" and all associated schedule data?')).toBeInTheDocument();
    expect(screen.getByText('Its schedule, payments, events and charges are deleted.')).toBeInTheDocument();
    expect(screen.getByText('Bank transactions stay; only their links to this loan go.')).toBeInTheDocument();
    expect(m.deleteLoan.mutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(m.deleteLoan.mutateAsync).not.toHaveBeenCalled();
  });

  it('Delete goes back to the loans once confirmed', async () => {
    renderView();
    await openMenu('More actions');
    await user.click(await screen.findByRole('menuitem', { name: 'Delete loan' }));
    await user.click(await screen.findByRole('button', { name: 'Delete loan' }));
    await waitFor(() => expect(m.deleteLoan.mutateAsync).toHaveBeenCalled());
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/loans'));
  });

  it('Edit opens the loan form, with the core terms locked once a payment or event exists', async () => {
    renderView();
    await openMenu('More actions');
    await user.click(await screen.findByRole('menuitem', { name: 'Edit loan' }));
    expect(await screen.findByText('Edit loan', { selector: 'h2, [role="heading"], div' })).toBeInTheDocument();
    expect(
      screen.getByText('Core terms (principal, rate, tenure, dates, EMI) are locked because events or payments exist.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Principal')).toBeDisabled();
    expect(screen.getByLabelText('Loan name')).not.toBeDisabled();
  });
});

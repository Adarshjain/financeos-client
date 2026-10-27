import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { bankCredit, employer, entry, globexOpen, interest, latestContribution, manualContribution, pensionWithdrawal, settled, transferOut, transferred, withdrawal } from './epf.fixtures';
import { EpfEntryDialog } from './EpfEntryDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-27' }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const http = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/client')>()), api: http }));

// The picker has its own tests; here it can pick a credit.
const picked = vi.hoisted(() => ({ credit: { id: 't9', amount: 40000, date: '2025-02-24', description: 'NEFT CR EPFO' } as Record<string, unknown> }));
vi.mock('@/features/transactions/TransactionPickerField', () => ({
  TransactionPickerField: (p: { type?: string; suggestAmount?: number | null; excludeAnyObligationRef?: boolean; onSelect: (t: unknown) => void }) => (
    <div data-testid="picker" data-type={p.type} data-amount={p.suggestAmount} data-exclusive={String(p.excludeAnyObligationRef)}>
      <button type="button" onClick={() => p.onSelect(picked.credit)}>
        Pick credit
      </button>
    </div>
  ),
}));

const ok = (data: unknown = {}) => Promise.resolve({ data });
const employers = [employer(), transferred(), settled()];
const field = (name: string) => screen.getByLabelText(new RegExp(`^${name}`)) as HTMLInputElement;
const tdsField = () => screen.getByLabelText('TDS') as HTMLInputElement;
const choose = async (label: RegExp, option: string | RegExp) => {
  fireEvent.click(screen.getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

beforeEach(() => {
  vi.clearAllMocks();
  http.POST.mockReturnValue(ok({ id: 'new' }));
  http.PUT.mockReturnValue(ok({}));
  http.DELETE.mockReturnValue(ok());
  picked.credit = { id: 't9', amount: 40000, date: '2025-02-24', description: 'NEFT CR EPFO' };
});

describe('EpfEntryDialog: adding', () => {
  it('opens as a contribution for the current employer, filled from the last contribution', () => {
    renderWithQuery(<EpfEntryDialog employers={employers} latestContribution={latestContribution()} onClose={vi.fn()} />);
    expect(screen.getByText('Add EPF entry')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Type/ })).toHaveTextContent('Contribution');
    expect(screen.getByRole('combobox', { name: /^Employer/ })).toHaveTextContent('Northwind Labs');
    expect(screen.getByRole('combobox', { name: /^Wage month/ })).toHaveTextContent('Oct 2026');
    expect(field('Credited on')).toHaveValue('15/11/2026');
    expect(field('Your share')).toHaveValue('7200');
    expect(field('Employer share')).toHaveValue('5950');
    expect(field('Pension')).toHaveValue('1250');
    expect(screen.getByText('Filled from your last contribution. Pension is not added to the balance.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete entry' })).toBeNull();
  });

  it('starts empty when there is no contribution to fill from', () => {
    renderWithQuery(<EpfEntryDialog employers={employers} onClose={vi.fn()} />);
    expect(field('Your share')).toHaveValue('');
    expect(field('Credited on')).toHaveValue('27/10/2026');
    expect(screen.queryByText(/Filled from your last contribution/)).toBeNull();
  });

  it('adds the contribution, then refreshes and closes', async () => {
    const onClose = vi.fn();
    const onChanged = vi.fn();
    renderWithQuery(<EpfEntryDialog employers={employers} latestContribution={latestContribution()} onClose={onClose} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/epf/entries', {
        body: { type: 'CONTRIBUTION', employerId: 'e1', creditedOn: '2026-11-15', wageMonth: '2026-10-01', employeeAmount: 7200, employerAmount: 5950, pensionAmount: 1250 },
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith('Entry added');
    expect(router.refresh).toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalled();
  });

  it('offers the five types, never Transfer out', async () => {
    renderWithQuery(<EpfEntryDialog employers={employers} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox', { name: /^Type/ }));
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).toEqual(['Contribution', 'Opening balance', 'Interest', 'Transfer in', 'Withdrawal']);
  });

  it('switches the fields with the type', async () => {
    renderWithQuery(<EpfEntryDialog employers={employers} latestContribution={latestContribution()} onClose={vi.fn()} />);
    await choose(/^Type/, 'Opening balance');
    expect(screen.getByRole('combobox', { name: /^Type/ })).toHaveTextContent('Opening balance');
    expect(screen.queryByRole('combobox', { name: /^Wage month/ })).toBeNull();
    expect(screen.queryByLabelText(/^Pension/)).toBeNull();
    expect(field('Balance as of')).toBeInTheDocument();
    expect(screen.getByText('Use the closing balance from your last passbook. Later entries add to it.')).toBeInTheDocument();

    await choose(/^Type/, 'Interest');
    expect(screen.getByRole('combobox', { name: /^For year/ })).toHaveTextContent('FY 2025-26');
    expect(screen.getByText('Replaces the estimate for FY 2025-26.')).toBeInTheDocument();

    await choose(/^Type/, 'Transfer in');
    expect(screen.getByRole('combobox', { name: /^To employer/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^From employer/ })).toBeInTheDocument();
    expect(screen.getByText("The old employer's balance moves to the new one. The total does not change.")).toBeInTheDocument();
  });

  it('adds an opening balance', async () => {
    renderWithQuery(<EpfEntryDialog employers={employers} initialType="OPENING_BALANCE" onClose={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /^Type/ })).toHaveTextContent('Opening balance');
    fireEvent.change(field('Your share'), { target: { value: '410920' } });
    fireEvent.change(field('Employer share'), { target: { value: '297210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/epf/entries', {
        body: { type: 'OPENING_BALANCE', employerId: 'e1', creditedOn: '2026-10-27', employeeAmount: 410920, employerAmount: 297210 },
      }),
    );
  });

  it('adds a transfer in from another employer', async () => {
    renderWithQuery(<EpfEntryDialog employers={employers} initialType="TRANSFER_IN" onClose={vi.fn()} />);
    await choose(/^From employer/, 'Contoso Systems');
    fireEvent.change(field('Your share'), { target: { value: '171300' } });
    fireEvent.change(field('Employer share'), { target: { value: '141100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/epf/entries', {
        body: { type: 'TRANSFER_IN', employerId: 'e1', creditedOn: '2026-10-27', fromEmployerId: 'e2', employeeAmount: 171300, employerAmount: 141100 },
      }),
    );
  });

  it('says what is missing and adds nothing', async () => {
    renderWithQuery(<EpfEntryDialog employers={employers} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Enter your share or the employer share.', { tone: 'danger' }));
    expect(http.POST).not.toHaveBeenCalled();
  });

  it('shows the server message and stays open when the server refuses', async () => {
    http.POST.mockRejectedValue(new ApiError(400, { code: 'VALIDATION', message: 'A contribution for Oct 2026 already exists.' }));
    const onClose = vi.fn();
    renderWithQuery(<EpfEntryDialog employers={employers} latestContribution={latestContribution()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('A contribution for Oct 2026 already exists.', { tone: 'danger' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('adds an employer from the Employer dropdown and selects it', async () => {
    http.POST.mockImplementation((url: string) => ok(url === '/api/v1/epf/employers' ? { ...employer(), id: 'e9', name: 'Fabrikam Ltd' } : {}));
    renderWithQuery(<EpfEntryDialog employers={employers} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox', { name: /^Employer/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add employer' }));
    expect(await screen.findByText('Name')).toBeInTheDocument();
    fireEvent.change(field('Name'), { target: { value: 'Fabrikam Ltd' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add employer' }).at(-1)!);
    await waitFor(() => expect(http.POST).toHaveBeenCalledWith('/api/v1/epf/employers', { body: { name: 'Fabrikam Ltd', memberId: null, joinedOn: null, leftOn: null } }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^Employer/ })).toHaveTextContent('Fabrikam Ltd'));
  });
});

describe('EpfEntryDialog: withdrawals', () => {
  const open = async () => {
    renderWithQuery(<EpfEntryDialog employers={employers} initialType="WITHDRAWAL" onClose={vi.fn()} />);
  };

  it('shows Kind, a Note and the TDS checkbox, with the amount received in the bank', async () => {
    await open();
    expect(screen.getByRole('combobox', { name: /^Kind/ })).toHaveTextContent('Partial (Form 31)');
    expect(screen.getByRole('combobox', { name: /^Employer/ })).toBeInTheDocument();
    expect(field('Paid on')).toBeInTheDocument();
    expect(field('Note')).toBeInTheDocument();
    expect(screen.queryByLabelText('TDS')).toBeNull();
    fireEvent.change(field('Your share'), { target: { value: '25000' } });
    fireEvent.change(field('Employer share'), { target: { value: '15000' } });
    expect(screen.getByText('Received in bank: ₹40,000. After you add it, a matching bank credit is suggested.')).toBeInTheDocument();
  });

  it('shows a TDS field when TDS was deducted and takes it off the received amount', async () => {
    await open();
    fireEvent.change(field('Your share'), { target: { value: '25000' } });
    fireEvent.change(field('Employer share'), { target: { value: '15000' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'TDS was deducted' }));
    fireEvent.change(tdsField(), { target: { value: '2000' } });
    expect(screen.getByText(/Received in bank: ₹38,000/)).toBeInTheDocument();
    fireEvent.change(field('Note'), { target: { value: 'Medical advance' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/epf/entries', {
        body: {
          type: 'WITHDRAWAL',
          withdrawalKind: 'PARTIAL',
          employerId: 'e1',
          creditedOn: '2026-10-27',
          employeeAmount: 25000,
          employerAmount: 15000,
          note: 'Medical advance',
          tdsAmount: 2000,
        },
      }),
    );
  });

  it('final settlement drops the Note and says the employer is marked Settled', async () => {
    await open();
    await choose(/^Kind/, 'Final settlement (Form 19)');
    expect(screen.queryByLabelText(/^Note/)).toBeNull();
    expect(screen.getByText(/adding it marks the employer Settled\./)).toBeInTheDocument();
  });

  it('final settlement fills the shares from the employer split, and follows a change of employer', async () => {
    renderWithQuery(<EpfEntryDialog employers={[employer(), globexOpen()]} initialType="WITHDRAWAL" onClose={vi.fn()} />);
    await choose(/^Employer/, 'Globex Retail');
    await choose(/^Kind/, 'Final settlement (Form 19)');
    expect(field('Your share')).toHaveValue('61800');
    expect(field('Employer share')).toHaveValue('50800');
    expect(screen.getByText("Received in bank: ₹1,12,600. Shares are filled with Globex Retail's full balance; adding it marks the employer Settled.")).toBeInTheDocument();
    await choose(/^Employer/, 'Northwind Labs');
    expect(field('Your share')).toHaveValue('460110');
  });

  it('pension withdrawal takes a single Amount and leaves the balance alone', async () => {
    await open();
    await choose(/^Kind/, 'Pension (Form 10C)');
    expect(screen.queryByLabelText(/^Your share/)).toBeNull();
    expect(screen.getByText("Pension is not in your EPF balance, so the balance doesn't change.")).toBeInTheDocument();
    fireEvent.change(field('Amount'), { target: { value: '28400' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/epf/entries', {
        body: { type: 'WITHDRAWAL', withdrawalKind: 'PENSION', employerId: 'e1', creditedOn: '2026-10-27', pensionAmount: 28400 },
      }),
    );
  });
});

describe('EpfEntryDialog: an entry you added', () => {
  it('opens with its values and saves a change', async () => {
    const onClose = vi.fn();
    renderWithQuery(<EpfEntryDialog entry={manualContribution()} employers={employers} onClose={onClose} />);
    expect(screen.getByText('Aug 2026 contribution')).toBeInTheDocument();
    expect(field('Your share')).toHaveValue('7200');
    expect(screen.getByText('Added by you. A passbook that has this month replaces it.')).toBeInTheDocument();
    fireEvent.change(field('Your share'), { target: { value: '7300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}', {
        params: { path: { id: 'n2' } },
        body: { type: 'CONTRIBUTION', employerId: 'e1', creditedOn: '2026-09-14', wageMonth: '2026-08-01', employeeAmount: 7300, employerAmount: 5950, pensionAmount: 1250 },
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith('Entry updated');
  });

  it('asks before deleting, says what goes, then deletes', async () => {
    const onClose = vi.fn();
    renderWithQuery(<EpfEntryDialog entry={manualContribution()} employers={employers} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }));
    expect(await screen.findByText('Delete the Aug 2026 contribution?')).toBeInTheDocument();
    expect(screen.getByText('This entry you added goes, and the balance drops by ₹13,150. Entries from the passbook stay.')).toBeInTheDocument();
    expect(http.DELETE).not.toHaveBeenCalled();
    const confirm = screen.getAllByRole('button', { name: 'Delete entry' }).at(-1)!;
    fireEvent.click(confirm);
    await waitFor(() => expect(http.DELETE).toHaveBeenCalledWith('/api/v1/epf/entries/{id}', { params: { path: { id: 'n2' } } }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith('Entry deleted');
  });

  it('edits both sides of a transfer from the transfer out, with the type and employers fixed', async () => {
    renderWithQuery(<EpfEntryDialog entry={transferOut()} employers={employers} onClose={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /^Type/ })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /^Type/ })).toHaveTextContent('Transfer out');
    expect(screen.getByRole('combobox', { name: /^From employer/ })).toHaveTextContent('Contoso Systems');
    expect(screen.getByRole('combobox', { name: /^To employer/ })).toHaveTextContent('Northwind Labs');
    fireEvent.change(field('Your share'), { target: { value: '170000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(http.PUT).toHaveBeenCalled());
    expect(http.PUT.mock.calls[0][1].body).toMatchObject({ type: 'TRANSFER_OUT', employerId: 'e2', employeeAmount: 170000 });
  });
});

describe('EpfEntryDialog: an entry imported from the passbook', () => {
  it('disables every field and offers Close only', () => {
    const onClose = vi.fn();
    renderWithQuery(<EpfEntryDialog entry={entry()} employers={employers} onClose={onClose} />);
    expect(screen.getByText('From the passbook imported on 16 Oct. Upload a newer passbook to change it.')).toBeInTheDocument();
    for (const name of [/^Type/, /^Employer/, /^Wage month/]) expect(screen.getByRole('combobox', { name })).toBeDisabled();
    for (const name of ['Credited on', 'Your share', 'Employer share', 'Pension']) expect(field(name)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete entry' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });

  it('locks an imported interest the same way', () => {
    renderWithQuery(<EpfEntryDialog entry={interest()} employers={employers} onClose={vi.fn()} />);
    expect(screen.getByText('Interest · FY 2025-26')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^For year/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  const imported = (overrides = {}) => withdrawal({ source: 'PASSBOOK', importedAt: '2026-10-16T10:00:00Z', ...overrides });

  it('lets a withdrawal change only its TDS and note, and saves them with the amounts it came with', async () => {
    renderWithQuery(<EpfEntryDialog entry={imported()} employers={employers} onClose={vi.fn()} />);
    expect(screen.getByText('From the passbook imported on 16 Oct. Only TDS, the note and the link can change.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Kind/ })).toBeDisabled();
    expect(field('Your share')).toBeDisabled();
    expect(field('Employer share')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'TDS was deducted' })).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'TDS was deducted' }));
    fireEvent.change(tdsField(), { target: { value: '2000' } });
    fireEvent.change(field('Note'), { target: { value: 'Home repair' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}', {
        params: { path: { id: 'n7' } },
        body: {
          type: 'WITHDRAWAL',
          withdrawalKind: 'PARTIAL',
          employerId: 'e1',
          creditedOn: '2025-02-22',
          employeeAmount: 25000,
          employerAmount: 15000,
          note: 'Home repair',
          tdsAmount: 2000,
        },
      }),
    );
  });

  it('has no Delete entry', () => {
    renderWithQuery(<EpfEntryDialog entry={imported()} employers={employers} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Delete entry' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});

describe('EpfEntryDialog: the bank credit of a withdrawal', () => {
  it('has none on other types', () => {
    renderWithQuery(<EpfEntryDialog entry={manualContribution()} employers={employers} onClose={vi.fn()} />);
    expect(screen.queryByText('Bank credit')).toBeNull();
    expect(screen.queryByTestId('picker')).toBeNull();
  });

  it('shows the suggested match with Link and Not this one', async () => {
    renderWithQuery(<EpfEntryDialog entry={withdrawal({ suggestion: bankCredit() })} employers={employers} onClose={vi.fn()} />);
    expect(screen.getByText('NEFT CR EPFO MUMBAI')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank ••4521 · 24 Feb 2025')).toBeInTheDocument();
    expect(screen.getByText('+₹40,000')).toBeInTheDocument();
    expect(screen.getByText('Suggested match')).toBeInTheDocument();
    expect(screen.getByText(/Not this one shows the next likely credit;/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
        params: { path: { id: 'n7' } },
        body: { transactionId: 't1', recordTds: false },
      }),
    );
    expect(showToast).toHaveBeenCalledWith('Linked', undefined);
  });

  it('dismisses a suggestion with Not this one', async () => {
    renderWithQuery(<EpfEntryDialog entry={withdrawal({ suggestion: bankCredit() })} employers={employers} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not this one' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/suggestion/dismiss', {
        params: { path: { id: 'n7' } },
        body: { transactionId: 't1' },
      }),
    );
  });

  it('opens the picker for any credit by hand, credits only', async () => {
    renderWithQuery(<EpfEntryDialog entry={withdrawal({ suggestion: bankCredit() })} employers={employers} onClose={vi.fn()} />);
    expect(screen.queryByTestId('picker')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Link transaction' }));
    const picker = await screen.findByTestId('picker');
    expect(picker).toHaveAttribute('data-type', 'CREDIT');
    expect(picker).toHaveAttribute('data-exclusive', 'true');
    expect(picker).toHaveAttribute('data-amount', '40000');
    fireEvent.click(within(picker).getByRole('button', { name: 'Pick credit' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
        params: { path: { id: 'n7' } },
        body: { transactionId: 't9', recordTds: false },
      }),
    );
  });

  it('shows the picker straight away with no suggestion', () => {
    renderWithQuery(<EpfEntryDialog entry={withdrawal()} employers={employers} onClose={vi.fn()} />);
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });

  it('offers to record the gap as TDS when the credit is short, and links with it', async () => {
    picked.credit = { id: 't9', amount: 38000, date: '2025-02-24', description: 'NEFT CR EPFO' };
    renderWithQuery(<EpfEntryDialog entry={withdrawal()} employers={employers} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick credit' }));
    expect(await screen.findByRole('checkbox', { name: 'Record TDS of ₹2,000' })).toBeChecked();
    expect(http.PUT).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
        params: { path: { id: 'n7' } },
        body: { transactionId: 't9', recordTds: true },
      }),
    );
  });

  it('shows the linked credit with Unlink, and the toast undoes it', async () => {
    renderWithQuery(<EpfEntryDialog entry={withdrawal({ transaction: bankCredit() })} employers={employers} onClose={vi.fn()} />);
    expect(screen.getByText('Linked')).toBeInTheDocument();
    expect(screen.queryByTestId('picker')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
    await waitFor(() => expect(http.DELETE).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', { params: { path: { id: 'n7' } } }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Unlinked from the EPF withdrawal', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) })));
    showToast.mock.calls.at(-1)![1].action.onSelect();
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', {
        params: { path: { id: 'n7' } },
        body: { transactionId: 't1', recordTds: false },
      }),
    );
  });

  it('shows a failed link as a message', async () => {
    http.PUT.mockRejectedValue(new ApiError(400, { code: 'VALIDATION', message: 'That credit is already linked.' }));
    renderWithQuery(<EpfEntryDialog entry={withdrawal({ suggestion: bankCredit() })} employers={employers} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('That credit is already linked.', { tone: 'danger' }));
  });

  it('refreshes the page after a link', async () => {
    const onChanged = vi.fn();
    renderWithQuery(<EpfEntryDialog entry={pensionWithdrawal()} employers={employers} onClose={vi.fn()} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick credit' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe('EpfEntryDialog: staying in step with the entry', () => {
  it('shows the TDS a link just recorded and keeps the other unsaved edits, so Save does not clear it', async () => {
    picked.credit = { id: 't9', amount: 38000, date: '2025-02-24', description: 'NEFT CR EPFO' };
    const view = renderWithQuery(<EpfEntryDialog entry={withdrawal()} employers={employers} onClose={vi.fn()} />);
    fireEvent.change(field('Note'), { target: { value: 'Edited note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pick credit' }));
    await screen.findByRole('checkbox', { name: 'Record TDS of ₹2,000' });
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(http.PUT).toHaveBeenCalled());

    // The page re-reads: the entry now carries the TDS and the credit.
    view.rerender(<EpfEntryDialog entry={withdrawal({ tdsAmount: 2000, transaction: bankCredit({ amount: 38000 }) })} employers={employers} onClose={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'TDS was deducted' })).toBeChecked();
    expect(tdsField()).toHaveValue('2000');
    expect(field('Note')).toHaveValue('Edited note');

    http.PUT.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(http.PUT).toHaveBeenCalled());
    expect(http.PUT.mock.calls[0][1].body).toMatchObject({ tdsAmount: 2000, note: 'Edited note' });
  });

  it('lists an employer added here once after the page re-reads it', async () => {
    http.POST.mockImplementation((url: string) => ok(url === '/api/v1/epf/employers' ? { ...employer(), id: 'e9', name: 'Fabrikam Ltd' } : {}));
    const view = renderWithQuery(<EpfEntryDialog employers={employers} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox', { name: /^Employer/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add employer' }));
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Fabrikam Ltd' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add employer' }).at(-1)!);
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^Employer/ })).toHaveTextContent('Fabrikam Ltd'));
    view.rerender(<EpfEntryDialog employers={[...employers, { ...employer(), id: 'e9', name: 'Fabrikam Ltd' }]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox', { name: /^Employer/ }));
    expect(await screen.findAllByRole('option', { name: 'Fabrikam Ltd' })).toHaveLength(1);
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoanFormDialog } from './LoanFormDialog';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: vi.fn(),
}));
vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));
const mutateAsync = vi.fn();
vi.mock('../useLoanMutations', () => ({ useCreateLoan: () => ({ mutateAsync, isPending: false }) }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));

const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({ id: 'L9' });
});

describe('LoanFormDialog prefill', () => {
  it('starts with the prefilled fields and keeps the rest default', () => {
    render(<LoanFormDialog onClose={vi.fn()} prefill={{ name: 'Car loan', emiAmount: '17540', firstEmiDate: '2026-01-05' }} />);
    expect(field('Loan name')).toHaveValue('Car loan');
    expect(field('EMI amount')).toHaveValue('17540');
    expect(screen.getByLabelText('First EMI due')).toHaveValue('05/01/2026');
    expect(field('Lender')).toHaveValue('');
  });

  it('calls onCreated with the new loan before closing', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    render(<LoanFormDialog onClose={onClose} onCreated={onCreated} prefill={{ name: 'Car loan' }} />);
    fireEvent.change(field('Lender'), { target: { value: 'HDFC' } });
    fireEvent.change(field('Principal'), { target: { value: '500000' } });
    fireEvent.change(field('Annual rate'), { target: { value: '9' } });
    fireEvent.change(field('Tenure'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add loan' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'L9' }));
    expect(onClose).toHaveBeenCalled();
  });
});

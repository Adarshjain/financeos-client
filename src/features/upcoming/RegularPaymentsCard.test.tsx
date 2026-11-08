import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecurringSeriesDto } from '@/lib/api/types';

import { RegularPaymentsCard } from './RegularPaymentsCard';

const actions = {
  track: vi.fn(),
  dismiss: vi.fn(),
  stop: vi.fn(),
  converted: vi.fn(),
};
vi.mock('./useRecurringActions', () => ({ useRecurringActions: () => actions }));

let created: ((loan: { id: string }) => unknown) | undefined;
vi.mock('@/lib/lazy/useLazyDialog', () => ({
  useLazyDialog: () => ({
    Component: (p: { prefill?: Record<string, string>; onClose: () => void; onCreated: (l: { id: string }) => unknown }) => {
      created = p.onCreated;
      return (
        <div data-testid="loan-form">
          {JSON.stringify(p.prefill)}
          <button onClick={p.onClose}>Cancel form</button>
        </div>
      );
    },
    run: async (fn: () => void) => {
      fn();
      return true;
    },
  }),
}));

const series = (o: Partial<RecurringSeriesDto>): RecurringSeriesDto => ({
  id: 'r1',
  kind: 'SUBSCRIPTION',
  displayName: 'Netflix',
  period: 'MONTHLY',
  amount: 649,
  lastPaidOn: '2026-10-02',
  nextDueOn: '2026-11-02',
  paymentCount: 6,
  accountName: 'HDFC Regalia',
  status: 'PROPOSED',
  ...o,
});

const EMI = series({
  id: 'r2',
  kind: 'EMI',
  displayName: 'Car loan EMI',
  amount: 17540,
  accountName: null,
  loanPrefill: { name: 'Car loan', emiAmount: 17540, emiDayOfMonth: 5, firstPaymentGuess: '2026-01-05', accountId: 'b1' },
});

beforeEach(() => vi.clearAllMocks());

describe('RegularPaymentsCard', () => {
  it('renders nothing without proposals', () => {
    const { container } = render(<RegularPaymentsCard proposals={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the title, line and kind per proposal, with actions by kind', () => {
    render(<RegularPaymentsCard proposals={[series({}), series({ id: 'r3', kind: 'OTHER', displayName: 'Rent' }), EMI]} />);
    expect(screen.getByText('Regular payments we found')).toBeInTheDocument();
    expect(screen.getAllByText(/monthly · 6 payments · last 2 Oct · HDFC Regalia/)).toHaveLength(2);
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Regular payment')).toBeInTheDocument();
    expect(screen.getByText('EMI')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Track' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Add loan' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Not regular' })).toHaveLength(3);
  });

  it('Track and Not regular call their actions with the series', async () => {
    render(<RegularPaymentsCard proposals={[series({})]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Track' }));
    expect(actions.track).toHaveBeenCalledWith('r1', 'Netflix');
    await userEvent.click(screen.getByRole('button', { name: 'Not regular' }));
    expect(actions.dismiss).toHaveBeenCalledWith('r1', 'Netflix');
  });

  it('Track shows loading until the action settles, ignores a second press, and works again after', async () => {
    let finish: (v: boolean) => void = () => {};
    actions.track.mockReturnValueOnce(new Promise<boolean>((r) => (finish = r)));
    render(<RegularPaymentsCard proposals={[series({})]} />);
    const track = screen.getByRole('button', { name: 'Track' });
    await userEvent.click(track);
    expect(track).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Not regular' })).toBeDisabled();
    await userEvent.click(track);
    await act(async () => finish(false));
    expect(actions.track).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Track' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Track' }));
    expect(actions.track).toHaveBeenCalledTimes(2);
  });

  it('Add loan opens the form prefilled and marks the series converted after create', async () => {
    render(<RegularPaymentsCard proposals={[EMI]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add loan' }));
    const form = screen.getByTestId('loan-form');
    expect(form).toHaveTextContent('"name":"Car loan"');
    expect(form).toHaveTextContent('"emiAmount":"17540"');
    expect(form).toHaveTextContent('"firstEmiDate":"2026-01-05"');
    expect(form).toHaveTextContent('"paymentAccountId":"b1"');
    expect(actions.converted).not.toHaveBeenCalled();
    created?.({ id: 'L9' });
    expect(actions.converted).toHaveBeenCalledWith('r2', 'L9');
  });

  it('cancelling the form leaves the proposal as it is', async () => {
    render(<RegularPaymentsCard proposals={[EMI]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add loan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel form' }));
    expect(screen.queryByTestId('loan-form')).toBeNull();
    expect(actions.converted).not.toHaveBeenCalled();
    expect(actions.dismiss).not.toHaveBeenCalled();
    expect(screen.getByText('Car loan EMI')).toBeInTheDocument();
  });
});

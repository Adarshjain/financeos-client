import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RewardMilestone } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

import { MilestonesSection } from './MilestonesSection';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const milestone = (over: Partial<RewardMilestone> = {}): RewardMilestone => ({
  id: 'm1',
  accountId: 'a1',
  name: 'Quarterly voucher',
  windowType: 'QUARTER',
  basis: 'SPEND',
  threshold: 100000,
  payoutType: 'CASH_VALUE',
  rewardType: 'CASH',
  payoutValue: 1000,
  payoutTiming: 'WINDOW_END',
  includeCategoryIds: [],
  includeMccs: [],
  excludeCategoryIds: [],
  excludeMccs: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});

let list: RewardMilestone[] = [];
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
vi.mock('../../queries/useRewardMilestonesQueries', () => ({
  useRewardMilestones: () => ({ data: list }),
  useCreateRewardMilestone: () => ({ mutate: create, isPending: false }),
  useUpdateRewardMilestone: () => ({ mutate: update, isPending: false }),
  useDeleteRewardMilestone: () => ({ mutate: remove, isPending: false }),
}));
vi.mock('../../queries/useRewardAccountConfigQueries', () => ({
  useRewardAccountConfig: () => ({ data: { defaultRewardType: 'POINTS' } }),
}));
vi.mock('@/lib/query/hooks/useCategories', () => ({
  useCategories: () => ({ data: [{ id: 'k1', name: 'Dining' }, { id: 'k2', name: 'Fuel' }] }),
}));
vi.mock('@/lib/query/hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [
      {
        id: 'a1',
        type: AccountType.CREDIT_CARD,
        cardholders: [
          { id: 'h1', accountId: 'a1', role: 'PRIMARY', personName: 'Arjun', currentLast4: '4521', openedOn: '2026-01-10', cards: [{ id: 'cd', cardholderId: 'h1', last4: '4521', issuedOn: '2026-01-10' }] },
        ],
      },
    ],
  }),
}));

const succeed = (...args: unknown[]) => (args[1] as { onSuccess: () => void }).onSuccess();
const textbox = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const choose = (label: string, option: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: new RegExp(`^${label}`) }));
  fireEvent.click(screen.getByRole('option', { name: option }));
};
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save milestone' }));

beforeEach(() => {
  vi.clearAllMocks();
  list = [milestone()];
  create.mockImplementation(succeed);
  update.mockImplementation(succeed);
  remove.mockImplementation((_id: string, opts: { onSuccess: () => void }) => opts.onSuccess());
});

describe('MilestonesSection', () => {
  it('lists milestones with target, window and payout', () => {
    render(<MilestonesSection accountId="a1" />);
    expect(screen.getByText('Quarterly voucher')).toBeInTheDocument();
    expect(screen.getByText('₹1,00,000 spend / quarter → ₹1,000')).toBeInTheDocument();
  });

  it('draws the progress bar and caption below the text, inside the row and not beside it', () => {
    render(
      <MilestonesSection accountId="a1" usage={{ m1: { pct: 40, label: '40% · 30 d left', range: '1 Jul → 30 Sep' } }} />,
    );
    const row = screen.getByText('Quarterly voucher').closest('[role="button"]') as HTMLElement;
    const bar = within(row).getByRole('progressbar');
    const caption = within(row).getByText('40% · 30 d left');
    const title = within(row).getByText('Quarterly voucher');
    expect(title.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Same column as the text, so the bar spans the row's content width.
    expect(bar.closest('div[class*="flex-1"]')).toBe(title.closest('div[class*="flex-1"]'));
  });

  it('says so when there are no milestones', () => {
    list = [];
    render(<MilestonesSection accountId="a1" />);
    expect(screen.getByText(/No milestones yet/)).toBeInTheDocument();
  });

  it('creates a milestone, preselecting the card’s reward type', () => {
    list = [];
    render(<MilestonesSection accountId="a1" />);
    fireEvent.click(screen.getByRole('button', { name: 'New milestone' }));
    expect(screen.getByRole('combobox', { name: /^Paid as/ })).toHaveTextContent('Reward points');
    fireEvent.change(textbox('Name'), { target: { value: 'Spend 4L' } });
    fireEvent.change(textbox('Threshold'), { target: { value: '400000' } });
    fireEvent.change(textbox('Payout value'), { target: { value: '10000' } });
    fireEvent.change(textbox('Count only these MCCs'), { target: { value: '5812, 5814' } });
    save();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'a1',
        name: 'Spend 4L',
        windowType: 'CALENDAR_MONTH',
        basis: 'SPEND',
        threshold: 400000,
        payoutType: 'CASH_VALUE',
        rewardType: 'POINTS',
        payoutValue: 10000,
        payoutTiming: 'WINDOW_END',
        includeMccs: ['5812', '5814'],
        cardholderId: null,
        activeFrom: null,
        activeTo: null,
      }),
      expect.anything(),
    );
    expect(toast).toHaveBeenCalledWith('Milestone created');
  });

  it('validates as Legacy does', () => {
    list = [];
    render(<MilestonesSection accountId="a1" />);
    fireEvent.click(screen.getByRole('button', { name: 'New milestone' }));
    save();
    expect(toast).toHaveBeenLastCalledWith('Milestone name is required.', { tone: 'danger' });
    fireEvent.change(textbox('Name'), { target: { value: 'X' } });
    save();
    expect(toast).toHaveBeenLastCalledWith('Threshold must be a positive number.', { tone: 'danger' });
    fireEvent.change(textbox('Threshold'), { target: { value: '5' } });
    save();
    expect(toast).toHaveBeenLastCalledWith('Payout value is required for a value-paying milestone.', { tone: 'danger' });
    fireEvent.change(textbox('Payout value'), { target: { value: '5' } });
    fireEvent.change(textbox('Never count these MCCs'), { target: { value: '65x' } });
    save();
    expect(toast).toHaveBeenLastCalledWith('MCC must be a 4-digit code: 65x', { tone: 'danger' });
    expect(create).not.toHaveBeenCalled();
  });

  it('asks for start and deadline on a one-time offer, and fills 90 days when a card is picked', () => {
    list = [];
    render(<MilestonesSection accountId="a1" />);
    fireEvent.click(screen.getByRole('button', { name: 'New milestone' }));
    choose('Window', 'One-time (welcome offer)');
    expect(screen.getByLabelText('Offer start')).toBeInTheDocument();
    expect(screen.getByLabelText('Offer deadline')).toBeInTheDocument();
    fireEvent.change(textbox('Name'), { target: { value: 'Welcome' } });
    fireEvent.change(textbox('Threshold'), { target: { value: '10000' } });
    fireEvent.change(textbox('Payout value'), { target: { value: '500' } });
    save();
    expect(toast).toHaveBeenLastCalledWith('A one-time milestone needs both a start date and a deadline.', { tone: 'danger' });
    choose('Cardholder scope', 'Arjun (•••• 4521)');
    expect(screen.getByLabelText('Offer start')).toHaveValue('10/01/2026');
    expect(screen.getByLabelText('Offer deadline')).toHaveValue('10/04/2026');
    save();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ windowType: 'ONE_TIME', cardholderId: 'h1', activeFrom: '2026-01-10', activeTo: '2026-04-10' }),
      expect.anything(),
    );
  });

  it('hides the amount, paid-as and timing for a tracker-only milestone', () => {
    list = [];
    render(<MilestonesSection accountId="a1" />);
    fireEvent.click(screen.getByRole('button', { name: 'New milestone' }));
    expect(screen.getByRole('combobox', { name: /^Credited/ })).toBeInTheDocument();
    choose('Payout', 'Tracker only (e.g. fee waiver)');
    expect(screen.queryByRole('combobox', { name: /^Paid as/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Payout value/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^Credited/ })).not.toBeInTheDocument();
    fireEvent.change(textbox('Name'), { target: { value: 'Fee waiver' } });
    fireEvent.change(textbox('Threshold'), { target: { value: '150000' } });
    save();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ payoutType: 'INFO_TRACKER', payoutValue: null }),
      expect.anything(),
    );
  });

  it('shows the minimum amount only when counting transactions', () => {
    list = [];
    render(<MilestonesSection accountId="a1" />);
    fireEvent.click(screen.getByRole('button', { name: 'New milestone' }));
    expect(screen.queryByRole('textbox', { name: /^Min txn amount/ })).not.toBeInTheDocument();
    choose('Counts', 'Transaction count');
    fireEvent.change(textbox('Min txn amount'), { target: { value: '1500' } });
    fireEvent.change(textbox('Name'), { target: { value: 'Four swipes' } });
    fireEvent.change(textbox('Threshold'), { target: { value: '4' } });
    fireEvent.change(textbox('Payout value'), { target: { value: '1000' } });
    save();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ basis: 'TXN_COUNT', threshold: 4, minTxnAmount: 1500 }),
      expect.anything(),
    );
  });

  it('opens a row filled in, and saves an edit', () => {
    render(<MilestonesSection accountId="a1" />);
    fireEvent.click(screen.getByText('Quarterly voucher'));
    expect(textbox('Name')).toHaveValue('Quarterly voucher');
    expect(textbox('Threshold')).toHaveValue('100000');
    fireEvent.change(textbox('Payout value'), { target: { value: '2000' } });
    save();
    expect(update).toHaveBeenCalledWith(
      { id: 'm1', body: expect.objectContaining({ payoutValue: 2000, name: 'Quarterly voucher' }) },
      expect.anything(),
    );
    expect(toast).toHaveBeenCalledWith('Milestone updated');
  });

  it('deletes after confirming', () => {
    render(<MilestonesSection accountId="a1" />);
    fireEvent.click(screen.getByText('Quarterly voucher'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete milestone' }));
    expect(screen.getByText('Delete milestone "Quarterly voucher"?')).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole('button', { name: 'Delete milestone' });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(remove).toHaveBeenCalledWith('m1', expect.anything());
    expect(toast).toHaveBeenCalledWith('Milestone deleted');
  });
});

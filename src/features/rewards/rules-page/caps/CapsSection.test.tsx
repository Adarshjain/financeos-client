import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RewardCapBucket, RewardRule } from '@/lib/rewards.types';

import { CapsSection } from './CapsSection';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const bucket = (over: Partial<RewardCapBucket> = {}): RewardCapBucket => ({
  id: 'c1',
  accountId: 'a1',
  name: 'Dining & grocery cap',
  cap: 5000,
  rewardType: 'POINTS',
  windowType: 'CALENDAR_MONTH',
  counterScope: 'ACCOUNT',
  ruleCount: 1,
  createdAt: '',
  updatedAt: '',
  ...over,
});

let caps: RewardCapBucket[] = [];
let rules: Partial<RewardRule>[] = [];
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
vi.mock('../../queries/useRewardCapBucketsQueries', () => ({
  useRewardCapBuckets: () => ({ data: caps }),
  useCreateRewardCapBucket: () => ({ mutate: create, isPending: false }),
  useUpdateRewardCapBucket: () => ({ mutate: update, isPending: false }),
  useDeleteRewardCapBucket: () => ({ mutate: remove, isPending: false }),
}));
vi.mock('../../queries/useRewardRulesQueries', () => ({ useRewardRules: () => ({ data: rules }) }));

const succeed = (...args: unknown[]) => (args[1] as { onSuccess: () => void }).onSuccess();

beforeEach(() => {
  vi.clearAllMocks();
  caps = [bucket()];
  rules = [
    { id: 'r1', priority: 2, capBucketId: 'c1' },
    { id: 'r2', priority: 1, capBucketId: null },
  ];
  create.mockImplementation(succeed);
  update.mockImplementation(succeed);
  remove.mockImplementation((_id: string, opts: { onSuccess: () => void }) => opts.onSuccess());
});

describe('CapsSection', () => {
  it('lists each cap with its amount, window and the rules using it', () => {
    render(<CapsSection accountId="a1" />);
    expect(screen.getByText('Dining & grocery cap')).toBeInTheDocument();
    expect(screen.getByText('5,000 pts · Per calendar month · used by rule 1')).toBeInTheDocument();
  });

  it('says so when there are no caps', () => {
    caps = [];
    render(<CapsSection accountId="a1" />);
    expect(screen.getByText(/No shared caps/)).toBeInTheDocument();
  });

  it('creates a cap with every field', async () => {
    caps = [];
    render(<CapsSection accountId="a1" />);
    fireEvent.click(screen.getByRole('button', { name: 'New cap' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'ACE combined' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^Cap/ }), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('combobox', { name: /^Counter scope/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Per cardholder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save cap' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        {
          accountId: 'a1',
          name: 'ACE combined',
          cap: 500,
          rewardType: 'CASH',
          windowType: 'CALENDAR_MONTH',
          counterScope: 'PER_CARDHOLDER',
        },
        expect.anything(),
      ),
    );
    expect(toast).toHaveBeenCalledWith('Cap created');
  });

  it('refuses a missing name and a non-positive cap', () => {
    caps = [];
    render(<CapsSection accountId="a1" />);
    fireEvent.click(screen.getByRole('button', { name: 'New cap' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save cap' }));
    expect(toast).toHaveBeenCalledWith('Cap name is required.', { tone: 'danger' });
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save cap' }));
    expect(toast).toHaveBeenCalledWith('Cap must be a positive number.', { tone: 'danger' });
    expect(create).not.toHaveBeenCalled();
  });

  it('opens a row to edit and saves the change', () => {
    render(<CapsSection accountId="a1" />);
    fireEvent.click(screen.getByText('Dining & grocery cap'));
    const cap = screen.getByRole('textbox', { name: /^Cap/ });
    expect(cap).toHaveValue('5000');
    fireEvent.change(cap, { target: { value: '6000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save cap' }));
    expect(update).toHaveBeenCalledWith(
      { id: 'c1', body: expect.objectContaining({ cap: 6000, name: 'Dining & grocery cap' }) },
      expect.anything(),
    );
    expect(toast).toHaveBeenCalledWith('Cap updated');
  });

  it('disables Reward type while rules use the cap, and explains why', () => {
    render(<CapsSection accountId="a1" />);
    fireEvent.click(screen.getByText('Dining & grocery cap'));
    expect(screen.getByRole('combobox', { name: /^Reward type/ })).toBeDisabled();
    expect(screen.getByText(/can’t be changed while rules still use the cap/)).toBeInTheDocument();
  });

  it('keeps Reward type editable for an unused cap', () => {
    caps = [bucket({ ruleCount: 0 })];
    rules = [];
    render(<CapsSection accountId="a1" />);
    fireEvent.click(screen.getByText('Dining & grocery cap'));
    expect(screen.getByRole('combobox', { name: /^Reward type/ })).not.toBeDisabled();
  });

  it('deletes an unused cap after confirming', () => {
    caps = [bucket({ ruleCount: 0 })];
    rules = [];
    render(<CapsSection accountId="a1" />);
    fireEvent.click(screen.getByText('Dining & grocery cap'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete cap' }));
    expect(screen.getByText('Delete cap "Dining & grocery cap"?')).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole('button', { name: 'Delete cap' });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(remove).toHaveBeenCalledWith('c1', expect.anything());
    expect(toast).toHaveBeenCalledWith('Cap deleted');
  });

  it('will not confirm deleting a cap that rules still use', () => {
    render(<CapsSection accountId="a1" />);
    fireEvent.click(screen.getByText('Dining & grocery cap'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete cap' }));
    expect(screen.getByText(/Detach them first/)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Delete cap' });
    expect(buttons[buttons.length - 1]).toBeDisabled();
  });
});

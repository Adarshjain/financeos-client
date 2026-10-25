import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountPicker } from './AccountPicker';

const accounts = [
  { id: 'k1', name: 'Zerodha', type: 'broker' },
  { id: 'c1', name: 'HDFC Regalia', type: 'credit_card', bank: 'hdfc', last4: '7741' },
  { id: 'w1', name: 'Paytm Wallet', type: 'generic' },
  { id: 'b1', name: 'ICICI Savings', type: 'bank_account', bank: 'icici', last4: '8832' },
  { id: 'b2', name: 'Cooperative Savings', type: 'bank_account', bank: null, last4: '9021' },
  { id: 'b3', name: 'Old Axis', type: 'bank_account', bank: 'axis', closedOn: '2020-01-01' },
] as unknown as Account[];

const brokers = [
  { id: 'k1', name: 'Zerodha', type: 'broker', clientId: 'ZQ4471' },
  { id: 'k2', name: 'Groww', type: 'broker', clientId: 'AB1234', closedOn: '2020-01-01' },
  { id: 'k3', name: 'Upstox', type: 'broker' },
] as unknown as Account[];

const ALL = [AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD, AccountType.GENERIC, AccountType.BROKER];

const labels = () => screen.getAllByRole('option').map((o) => o.textContent);

describe('AccountPicker', () => {
  it('lists only the types asked for', () => {
    render(<AccountPicker accounts={accounts} types={[AccountType.CREDIT_CARD]} defaultOpen />);
    expect(labels()).toEqual(['HDFC Regalia']);
  });

  it('groups by type in bank, credit card, wallet, broker order whatever the order of types and accounts', () => {
    render(<AccountPicker accounts={accounts} types={[...ALL].reverse()} defaultOpen />);
    const text = screen.getByRole('listbox').textContent ?? '';
    const at = ['Bank', 'Credit card', 'Wallet', 'Broker'].map((g) => text.indexOf(g));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(labels()).toEqual(['ICICI Savingsb', 'Cooperative Savings', 'Old AxisClosed', 'HDFC Regalia', 'Paytm Wallet', 'Zerodha'].map((l) => expect.stringContaining(l.replace(/Closed|b$/, ''))));
  });

  it('shows a logo for bank and card options, a letter tile for an unknown bank, nothing for wallets and brokers', () => {
    render(<AccountPicker accounts={accounts} types={ALL} defaultOpen />);
    const row = (name: string) => screen.getByText(name).closest('[role="option"]') as HTMLElement;
    expect(within(row('ICICI Savings')).getByRole('img', { name: 'ICICI Bank' })).toBeInTheDocument();
    expect(within(row('HDFC Regalia')).getByRole('img', { name: 'HDFC Bank' })).toBeInTheDocument();
    expect(within(row('Cooperative Savings')).queryByRole('img')).toBeNull();
    expect(within(row('Cooperative Savings')).getByText('C')).toBeInTheDocument();
    expect(screen.queryByTestId('bank-missing')).toBeNull();
    expect(within(row('Paytm Wallet')).queryByRole('img')).toBeNull();
    expect(within(row('Zerodha')).queryByRole('img')).toBeNull();
    expect(within(row('Zerodha')).queryByText('Z')).toBeNull();
  });

  it('marks closed accounts', () => {
    render(<AccountPicker accounts={accounts} types={ALL} defaultOpen />);
    expect(within(screen.getByText('Old Axis').closest('[role="option"]') as HTMLElement).getByText('Closed')).toBeInTheDocument();
  });

  it('labels a broker with a client id "Name · clientId", marks Closed as the hint, and leaves one without a client id plain', () => {
    render(<AccountPicker accounts={brokers} types={[AccountType.BROKER]} defaultOpen />);
    const row = (name: string) => screen.getByText(name).closest('[role="option"]') as HTMLElement;
    expect(row('Zerodha · ZQ4471').textContent).toBe('Zerodha · ZQ4471');
    expect(within(row('Groww · AB1234')).getByText('Closed')).toBeInTheDocument();
    expect(row('Upstox').textContent).toBe('Upstox');
  });

  it('searches a broker by client id', () => {
    render(<AccountPicker accounts={brokers} types={[AccountType.BROKER]} defaultOpen />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zq44' } });
    expect(labels()).toEqual([expect.stringContaining('Zerodha')]);
  });

  it('single: picking reports the id, and the field shows the name and logo', () => {
    const onValueChange = vi.fn();
    render(<AccountPicker accounts={accounts} types={ALL} defaultOpen onValueChange={onValueChange} />);
    fireEvent.click(screen.getByText('HDFC Regalia'));
    expect(onValueChange).toHaveBeenCalledWith('c1');
    const field = screen.getByRole('combobox');
    expect(field).toHaveTextContent('HDFC Regalia');
    expect(within(field).getByRole('img', { name: 'HDFC Bank' })).toBeInTheDocument();
  });

  it('single: a null value shows the placeholder', () => {
    render(<AccountPicker accounts={accounts} types={ALL} value={null} placeholder="Select account" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Select account');
  });

  it('multiple: reports the list of ids', () => {
    const onValueChange = vi.fn();
    render(<AccountPicker multiple accounts={accounts} types={ALL} defaultOpen onValueChange={onValueChange} />);
    fireEvent.click(screen.getByText('HDFC Regalia'));
    fireEvent.click(screen.getByText('ICICI Savings'));
    expect(onValueChange).toHaveBeenLastCalledWith(['c1', 'b1']);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('searches by name, bank name and last four', () => {
    render(<AccountPicker accounts={accounts} types={ALL} defaultOpen />);
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'icici' } });
    expect(labels()).toEqual([expect.stringContaining('ICICI Savings')]);
    fireEvent.change(search, { target: { value: '7741' } });
    expect(labels()).toEqual([expect.stringContaining('HDFC Regalia')]);
    fireEvent.change(search, { target: { value: 'wallet' } });
    expect(labels()).toEqual(['Paytm Wallet']);
  });

  it('puts leadingOptions first and ungrouped', () => {
    render(
      <AccountPicker
        accounts={accounts}
        types={[AccountType.CREDIT_CARD]}
        leadingOptions={[{ value: 'none', label: 'Unattributed' }]}
        defaultOpen
      />,
    );
    expect(labels()).toEqual(['Unattributed', 'HDFC Regalia']);
    expect(screen.getByRole('listbox').textContent?.startsWith('Unattributed')).toBe(true);
  });

  it('greys a disabled leading option', () => {
    render(
      <AccountPicker
        accounts={accounts}
        types={[AccountType.CREDIT_CARD]}
        leadingOptions={[{ value: 'old', label: 'Old card', disabled: true, disabledReason: 'Closed' }]}
        defaultOpen
      />,
    );
    expect(screen.getByText('Old card')).toHaveClass('text-ink-faint');
  });
});

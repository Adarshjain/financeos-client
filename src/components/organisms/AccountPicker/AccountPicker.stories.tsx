import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { AccountPicker } from '@/components/organisms';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

const accounts = [
  { id: 'b1', name: 'HDFC Salary', type: 'bank_account', bank: 'hdfc', last4: '1204' },
  { id: 'b2', name: 'ICICI Savings', type: 'bank_account', bank: 'icici', last4: '8832' },
  { id: 'b3', name: 'SBI Joint', type: 'bank_account', bank: 'sbi', last4: '5567' },
  { id: 'b4', name: 'Cooperative Savings', type: 'bank_account', bank: null, last4: '9021' },
  { id: 'c1', name: 'HDFC Regalia', type: 'credit_card', bank: 'hdfc', last4: '7741' },
  { id: 'c2', name: 'Axis Magnus', type: 'credit_card', bank: 'axis', last4: '4410' },
  { id: 'c3', name: 'ICICI Amazon Pay', type: 'credit_card', bank: 'icici', last4: '3310' },
  { id: 'w1', name: 'Paytm Wallet', type: 'generic' },
  { id: 'w2', name: 'Cash', type: 'generic' },
  { id: 'k1', name: 'Zerodha', type: 'broker', clientId: 'ZQ4471' },
  { id: 'k2', name: 'Groww', type: 'broker', clientId: 'AB1234', closedOn: '2020-01-01' },
] as unknown as Account[];

const meta: Meta<typeof AccountPicker> = {
  title: 'Organisms/AccountPicker',
  component: AccountPicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The account dropdown used everywhere. It takes all the accounts and the types to show, groups them by type (bank, credit card, wallet, broker), shows a bank logo for bank and card accounts (a letter tile when the bank is unknown), and searches by name, bank, last four and a broker client id (a broker is labelled "Name · clientId").',
      },
    },
  },
  argTypes: {
    accounts: { control: 'object' },
    types: {
      control: 'check',
      options: [AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD, AccountType.GENERIC, AccountType.BROKER],
    },
    multiple: { control: 'boolean' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    leadingOptions: { control: 'object' },
    doneLabel: { control: false },
    value: { control: false },
    defaultValue: { control: false },
    trigger: { control: false },
    onValueChange: { control: false },
  },
  args: {
    accounts,
    types: [AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD, AccountType.GENERIC, AccountType.BROKER],
    multiple: false,
    label: 'Account',
    placeholder: 'Select account',
    disabled: false,
    onValueChange: fn(),
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    const onValueChange = (next: string | string[] | null) => {
      (args.onValueChange as ((v: unknown) => void) | undefined)?.(next);
      updateArgs({ value: next });
    };
    return (
      <div className="w-container-xs">
        {args.multiple ? (
          <AccountPicker {...args} multiple value={(value as string[] | undefined) ?? []} onValueChange={onValueChange} />
        ) : (
          <AccountPicker {...args} multiple={false} value={(value as string | null | undefined) ?? null} onValueChange={onValueChange} />
        )}
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof AccountPicker>;

export const Single: Story = { args: { value: 'c1' } };

export const Multiple: Story = {
  args: { multiple: true, label: 'Accounts', placeholder: 'Any account', value: ['b1', 'c2'] },
};

export const TypesSubset: Story = {
  args: { types: [AccountType.CREDIT_CARD], label: 'Card', placeholder: 'Select card' },
};

export const WithLeadingOptions: Story = {
  args: {
    types: [AccountType.CREDIT_CARD],
    label: 'Card',
    leadingOptions: [{ value: 'none', label: 'Unattributed' }],
    value: 'none',
  },
};

export const DisabledOption: Story = {
  args: {
    types: [AccountType.CREDIT_CARD],
    label: 'Card',
    leadingOptions: [{ value: 'old', label: 'HDFC Millennia', disabled: true, disabledReason: 'Closed' }],
  },
};

export const Disabled: Story = { args: { disabled: true, value: 'b2' } };

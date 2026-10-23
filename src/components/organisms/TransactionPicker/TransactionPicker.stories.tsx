import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { TransactionPicker } from '@/components/organisms';

const meta: Meta<typeof TransactionPicker> = {
  title: 'Organisms/TransactionPicker',
  component: TransactionPicker,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'One open transaction list: a search field, rows with a radio (or checkbox) at the left and the amount at the right, a Debit / Credit filter, and a Pager above and below the list. The page fetches; the list never filters.',
      },
    },
  },
  argTypes: {
    multiple: { control: 'boolean' },
    query: { control: 'text' },
    loading: { control: 'boolean' },
    filter: { control: 'select', options: ['all', 'debit', 'credit'] },
    page: { control: 'number' },
    pageSize: { control: 'number' },
    totalElements: { control: 'number' },
    items: { control: 'object' },
    error: { control: 'text' },
    label: { control: 'text' },
    emptyLabel: { control: 'text' },
    value: { control: false },
    defaultValue: { control: false },
    defaultQuery: { control: false },
  },
  args: {
    multiple: false,
    query: '',
    loading: false,
    filter: 'all',
    page: 0,
    pageSize: 5,
    totalElements: 23,
    label: 'Open transactions',
    emptyLabel: 'No matching transactions',
    value: null,
    items: [
      {
        id: 't1',
        title: 'Croma Electronics',
        subtitle: '9 Sep · HDFC Regalia ••7741',
        amount: '24,990.00',
      },
      {
        id: 't2',
        title: 'BigBasket',
        subtitle: '12 Oct · HDFC Regalia ••7741',
        amount: '3,600.00',
      },
      {
        id: 't3',
        title: 'NEFT CR Rahul Sharma',
        subtitle: '28 Sep · HDFC Savings ••1204',
        amount: '5,000.00',
        isCredit: true,
      },
      {
        id: 't4',
        title: 'Uber',
        subtitle: '12 Oct · Paytm Wallet',
        amount: '533.00',
      },
      {
        id: 't5',
        title: 'Swiggy',
        subtitle: '2 Oct · ICICI Amazon Pay ••3310',
        amount: '1,245.00',
        disabled: true,
        disabledReason: 'Already linked',
      },
    ],
    onValueChange: fn(),
    onQueryChange: fn(),
    onFilterChange: fn(),
    onPageChange: fn(),
  },
  render: function Render(args) {
    const [{ value, query, filter, page }, updateArgs] = useArgs();
    return (
      <TransactionPicker
        {...args}
        value={value ?? (args.multiple ? [] : null)}
        query={query}
        onValueChange={(next) => {
          args.onValueChange?.(next);
          updateArgs({ value: next });
        }}
        filter={filter}
        onFilterChange={(next) => {
          args.onFilterChange?.(next);
          updateArgs({ filter: next, page: 0 });
        }}
        page={page}
        onPageChange={(next) => {
          args.onPageChange?.(next);
          updateArgs({ page: next });
        }}
        onQueryChange={(next) => {
          args.onQueryChange?.(next);
          updateArgs({ query: next, page: 0 });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof TransactionPicker>;

export const Default: Story = {};

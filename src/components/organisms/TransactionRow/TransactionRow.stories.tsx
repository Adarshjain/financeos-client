import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Avatar, Card, DataTable, SwipeActions } from '@/components/ds';
import {
  transactionColumns,
  TransactionRow,
  type TransactionRowData,
} from '@/components/organisms';

const meta: Meta<typeof TransactionRow> = {
  title: 'Organisms/TransactionRow',
  component: TransactionRow,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Card className="max-w-sm w-full p-0 overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  argTypes: {
    description: {
      control: 'text',
      description: 'Merchant or main transaction description',
    },
    amount: {
      control: 'text',
      description: 'Formatted transaction amount',
    },
    balance: {
      control: 'text',
      description: 'Running balance below amount',
    },
    account: {
      control: 'text',
      description: 'Account name',
    },
    plastic: {
      control: 'text',
      description: 'Plastic / card suffix (••7741)',
    },
    reviewStatus: {
      control: 'text',
      description: 'Amber review status word',
    },
    provenance: {
      control: 'text',
      description: 'Provenance source (Statement, Gmail, Manual)',
    },
    isCredit: {
      control: 'boolean',
      description: 'Whether amount is credit (+ positive)',
    },
    selected: {
      control: 'boolean',
      description: 'Selected row state with 4px stripe',
    },
    selectable: {
      control: 'boolean',
      description: 'Whether row is selectable',
    },
    tone: {
      control: 'select',
      options: ['default', 'warning'],
      description: 'Visual tone (default or warning)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state (dimmed)',
    },
    selectionMode: {
      control: 'boolean',
      description: 'Shows trailing eye button',
    },
    chevron: {
      control: 'boolean',
      description: 'Shows trailing chevron icon',
    },
    borderTop: {
      control: 'boolean',
      description: 'Shows top border line',
    },
    categories: {
      control: 'object',
      description: 'Assigned categories array',
    },
    link: {
      control: 'object',
      description: 'Link object or label',
    },
    note: {
      control: 'text',
      description: 'Note text',
    },
    unsetCategoryLabel: {
      control: 'text',
      description: 'Label for unset category',
    },
    leading: {
      control: false,
    },
    contextLine: {
      control: false,
    },
  },
  args: {
    onDetail: fn(),
    onSetCategory: fn(),
    onCategoryClick: fn(),
    onMoreCategoriesClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionRow>;

export const Default: Story = {
  args: {
    description: 'BigBasket',
    amount: '3,600.00',
    balance: 'bal ₹61,757',
    account: 'HDFC Bank Savings',
    provenance: 'Statement',
    categories: ['Groceries'],
  },
};

export const Credit: Story = {
  args: {
    description: 'Salary · Bolt Technologies',
    amount: '+2,15,000.00',
    balance: 'bal ₹5,61,400',
    account: 'HDFC Bank Savings',
    provenance: 'Statement',
    categories: ['Salary'],
    isCredit: true,
  },
};

export const ReviewDuplicate: Story = {
  args: {
    description: 'Swiggy Bangalore',
    amount: '1,249.00',
    balance: 'bal ₹44,319',
    account: 'HDFC Regalia',
    plastic: '••7741',
    reviewStatus: 'Duplicate',
    provenance: 'Gmail',
    categories: ['Food & dining', 'Delivery'],
  },
};

export const TransferLink: Story = {
  args: {
    description: 'Card bill payment',
    amount: '44,319.00',
    account: 'HDFC Bank Savings',
    link: { label: 'Transfer out' },
    categories: ['Bills'],
  },
};

export const MonitoredUnset: Story = {
  args: {
    description: 'Truffles St Marks Road',
    amount: '1,860.00',
    account: 'Amex Platinum',
    plastic: '••1008',
    reviewStatus: 'Watching',
    provenance: 'Manual',
    categories: [],
    unsetCategoryLabel: 'Set category',
    tone: 'warning',
  },
};

export const SelectedSelectionMode: Story = {
  args: {
    description: 'Uber India',
    amount: '640.00',
    account: 'Amex Platinum',
    plastic: '••1008',
    link: { label: 'EMI #8 · HDFC car loan', isRecord: true },
    categories: ['Transport'],
    selectable: true,
    selected: true,
    selectionMode: true,
    onSelectedChange: fn(),
  },
  render: function SelectedSelectionModeStory(args) {
    const [{ selected = true }, updateArgs] = useArgs();
    return (
      <TransactionRow
        {...args}
        selected={selected}
        selectionMode={selected}
        onSelectedChange={(s) => {
          args.onSelectedChange?.(s);
          updateArgs({ selected: s, selectionMode: s });
        }}
      />
    );
  },
};

export const Excluded: Story = {
  args: {
    description: 'Transfer to self',
    amount: '10,000.00',
    account: 'HDFC Bank Savings',
    provenance: 'Excluded',
    categories: ['Transfers'],
    disabled: true,
  },
};

export const WithLeadingAvatar: Story = {
  args: {
    description: 'HDFC Home Loan EMI',
    amount: '48,250.00',
    account: 'HDFC Bank Savings',
    categories: ['Housing'],
    chevron: true,
    leading: <Avatar variant="square" tone="inverse" initials="HD" size="md" />,
  },
};

export const SelectableInteractive: Story = {
  args: {
    description: 'Swiggy Bangalore',
    amount: '1,249.00',
    balance: 'bal ₹44,319',
    account: 'HDFC Regalia',
    plastic: '••7741',
    selectable: true,
    selected: false,
    categories: ['Food & dining'],
    onSelectedChange: fn(),
  },
  render: function SelectableRowStory(args) {
    const [{ selected = false }, updateArgs] = useArgs();
    return (
      <TransactionRow
        {...args}
        selected={selected}
        selectionMode={selected}
        onSelectedChange={(s) => {
          args.onSelectedChange?.(s);
          updateArgs({ selected: s, selectionMode: s });
        }}
      />
    );
  },
};

const sampleTransaction: TransactionRowData = {
  id: 'tx-1',
  date: '15 Oct',
  description: 'Apple Store Regent Street',
  category: 'Electronics',
  account: 'HDFC Regalia',
  plastic: '••7741',
  amount: 119900,
  formattedAmount: '₹1,19,900.00',
  balance: 'bal ₹42,100',
  reviewStatus: 'Watching',
};

const sampleTransactions: TransactionRowData[] = [
  sampleTransaction,
  {
    id: 'tx-2',
    date: '14 Oct',
    description: 'Starbucks Coffee',
    category: 'Food & dining',
    account: 'HDFC Bank Savings',
    amount: 750,
    formattedAmount: '₹750.00',
    balance: 'bal ₹1,62,000',
  },
  {
    id: 'tx-3',
    date: '14 Oct',
    description: 'Salary Credit - Acuity Systems',
    category: 'Income',
    account: 'HDFC Bank Savings',
    amount: 215000,
    formattedAmount: '+₹2,15,000.00',
    isCredit: true,
    balance: 'bal ₹1,62,750',
    provenance: 'Statement',
  },
  {
    id: 'tx-4',
    date: '12 Oct',
    description: 'Zara Clothing Mall of India',
    category: 'Shopping',
    account: 'HDFC Regalia',
    plastic: '••7741',
    amount: 4990,
    formattedAmount: '₹4,990.00',
    balance: 'bal ₹1,61,990',
    note: 'Winter jacket',
  },
];

export const Desktop: StoryObj = {
  decorators: [
    (Story) => (
      <Card className="w-full max-w-5xl p-0 overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  render: () => (
    <DataTable
      columns={transactionColumns}
      data={[sampleTransaction]}
      getRowId={(r) => r.id}
      renderRow={(row, rowProps) => (
        <TransactionRow
          key={row.id}
          date={row.date}
          description={row.description}
          amount={row.formattedAmount ?? String(row.amount)}
          balance={row.balance}
          account={row.account}
          plastic={row.plastic}
          reviewStatus={row.reviewStatus}
          categories={row.category ? [row.category] : undefined}
          isCredit={row.isCredit}
          selectable={rowProps.selectable}
          selected={rowProps.selected}
          onSelectedChange={rowProps.onSelectedChange}
        />
      )}
    />
  ),
};

export const InDataTable: StoryObj = {
  decorators: [
    (Story) => (
      <Card className="w-full max-w-5xl p-0 overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  render: function InDataTableStory() {
    const [{ selection = [], sort }, updateArgs] = useArgs();
    return (
      <DataTable
        columns={transactionColumns}
        data={sampleTransactions}
        getRowId={(r) => r.id}
        selectable
        selection={selection}
        onSelectionChange={(s) => updateArgs({ selection: s })}
        sort={sort}
        onSortChange={(s) => updateArgs({ sort: s })}
        renderRow={(row, rowProps) => (
          <TransactionRow
            key={row.id}
            date={row.date}
            description={row.description}
            amount={row.formattedAmount ?? String(row.amount)}
            balance={row.balance}
            account={row.account}
            plastic={row.plastic}
            reviewStatus={row.reviewStatus}
            note={row.note}
            provenance={row.provenance}
            categories={row.category ? [row.category] : undefined}
            isCredit={row.isCredit}
            selectable={rowProps.selectable}
            selected={rowProps.selected}
            onSelectedChange={rowProps.onSelectedChange}
            selectionMode={rowProps.selectionMode}
            onDetail={rowProps.onSelect}
          />
        )}
      />
    );
  },
};

export const InDataTableSwipe: StoryObj = {
  decorators: [
    (Story) => (
      <Card className="w-full max-w-5xl p-0 overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  render: function InDataTableSwipeStory() {
    const [{ selection = [] }, updateArgs] = useArgs();
    return (
      <DataTable
        columns={transactionColumns}
        data={sampleTransactions}
        getRowId={(r) => r.id}
        selectable
        selection={selection}
        onSelectionChange={(s) => updateArgs({ selection: s })}
        onRowSelect={fn()}
        wrapRow={(row, node) => (
          <SwipeActions
            key={row.id}
            left={{
              label: 'Approve',
              tone: 'brand',
              onTrigger: fn(),
            }}
            right={{
              label: 'Exclude',
              tone: 'danger',
              onTrigger: fn(),
            }}
          >
            {node}
          </SwipeActions>
        )}
        renderRow={(row, rowProps) => (
          <TransactionRow
            key={row.id}
            date={row.date}
            description={row.description}
            amount={row.formattedAmount ?? String(row.amount)}
            balance={row.balance}
            account={row.account}
            plastic={row.plastic}
            categories={row.category ? [row.category] : undefined}
            isCredit={row.isCredit}
            selectable={rowProps.selectable}
            selected={rowProps.selected}
            onSelectedChange={rowProps.onSelectedChange}
            selectionMode={rowProps.selectionMode}
            onDetail={rowProps.onSelect}
          />
        )}
      />
    );
  },
};

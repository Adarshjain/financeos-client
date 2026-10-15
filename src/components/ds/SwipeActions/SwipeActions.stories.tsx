import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '../Card/Card';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { StatusWord } from '../StatusWords/StatusWords';
import { SwipeActions } from './SwipeActions';

const TransactionSampleRow = ({
  merchant,
  amount,
  account,
  category,
  status,
}: {
  merchant: string;
  amount: string;
  account: string;
  category: string;
  status?: string;
}) => (
  <div className="flex flex-col p-space-12 bg-surface select-none font-text">
    <div className="flex items-baseline justify-between gap-space-8">
      <span className="font-extrabold text-body text-ink">{merchant}</span>
      <span className="font-bold text-body text-ink tabular-nums">{amount}</span>
    </div>
    <div className="flex items-center gap-space-6 text-caption text-ink-3 mt-space-2">
      <span>{account}</span>
      {status ? (
        <>
          <span>·</span>
          <StatusWord tone="review">{status}</StatusWord>
        </>
      ) : null}
    </div>
    <div className="mt-space-6">
      <CategoryChip>{category}</CategoryChip>
    </div>
  </div>
);

const meta: Meta<typeof SwipeActions> = {
  title: 'DS/Actions/SwipeActions',
  component: SwipeActions,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disable swipe gesture on this row',
    },
    variant: {
      control: 'select',
      options: ['transactions', 'inbox'],
      description: 'Preset slot configuration',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SwipeActions>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-16 max-w-sm w-full font-text">
      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Both sides (Transactions: swipe right Approve · swipe left Delete)
        </h4>
        <Card className="overflow-hidden p-0">
          <SwipeActions
            variant="transactions"
            onApprove={() => alert('Approved')}
            onDelete={() => alert('Delete confirmed')}
          >
            <TransactionSampleRow
              merchant="Swiggy Bangalore"
              amount="₹1,249.00"
              account="HDFC Regalia ••7741"
              category="Food & dining"
              status="Duplicate"
            />
          </SwipeActions>
        </Card>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Right only (Delete only)
        </h4>
        <Card className="overflow-hidden p-0">
          <SwipeActions
            right={{ label: 'Delete', tone: 'danger' }}
            onDelete={() => alert('Deleted')}
          >
            <TransactionSampleRow
              merchant="Uber India"
              amount="₹640.00"
              account="Amex Platinum ••1008 · Gmail"
              category="Transport"
            />
          </SwipeActions>
        </Card>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Left only (Approve only)
        </h4>
        <Card className="overflow-hidden p-0">
          <SwipeActions
            left={{ label: 'Approve', tone: 'brand' }}
            onApprove={() => alert('Approved')}
          >
            <TransactionSampleRow
              merchant="Starbucks Coffee"
              amount="₹350.00"
              account="HDFC Regalia ••7741"
              category="Food & dining"
            />
          </SwipeActions>
        </Card>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Disabled
        </h4>
        <Card className="overflow-hidden p-0">
          <SwipeActions disabled variant="transactions">
            <TransactionSampleRow
              merchant="Amazon Pay"
              amount="₹2,100.00"
              account="ICICI Sapphiro ••9021"
              category="Shopping"
            />
          </SwipeActions>
        </Card>
      </div>
    </div>
  ),
};

export const BothSides: Story = {
  name: 'Both sides',
  args: {
    variant: 'transactions',
  },
  render: (args) => (
    <Card className="max-w-sm w-full overflow-hidden p-0">
      <SwipeActions
        {...args}
        onApprove={() => alert('Approved')}
        onDelete={() => alert('Deleted')}
      >
        <TransactionSampleRow
          merchant="Swiggy Bangalore"
          amount="₹1,249.00"
          account="HDFC Regalia ••7741"
          category="Food & dining"
          status="Duplicate"
        />
      </SwipeActions>
    </Card>
  ),
};

export const RightOnly: Story = {
  name: 'Right only',
  args: {
    right: { label: 'Delete', tone: 'danger' },
  },
  render: (args) => (
    <Card className="max-w-sm w-full overflow-hidden p-0">
      <SwipeActions
        {...args}
        onDelete={() => alert('Deleted')}
      >
        <TransactionSampleRow
          merchant="Uber India"
          amount="₹640.00"
          account="Amex Platinum ••1008 · Gmail"
          category="Transport"
        />
      </SwipeActions>
    </Card>
  ),
};

export const LeftOnly: Story = {
  name: 'Left only',
  args: {
    left: { label: 'Approve', tone: 'brand' },
  },
  render: (args) => (
    <Card className="max-w-sm w-full overflow-hidden p-0">
      <SwipeActions
        {...args}
        onApprove={() => alert('Approved')}
      >
        <TransactionSampleRow
          merchant="Starbucks Coffee"
          amount="₹350.00"
          account="HDFC Regalia ••7741"
          category="Food & dining"
        />
      </SwipeActions>
    </Card>
  ),
};

export const Disabled: Story = {
  name: 'Disabled',
  args: {
    disabled: true,
    variant: 'transactions',
  },
  render: (args) => (
    <Card className="max-w-sm w-full overflow-hidden p-0">
      <SwipeActions {...args}>
        <TransactionSampleRow
          merchant="Amazon Pay"
          amount="₹2,100.00"
          account="ICICI Sapphiro ••9021"
          category="Shopping"
        />
      </SwipeActions>
    </Card>
  ),
};

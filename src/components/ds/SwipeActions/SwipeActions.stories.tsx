import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Card } from '../Card/Card';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { StatusWord } from '../StatusWords/StatusWords';
import { SwipeActions } from './SwipeActions';

const meta: Meta<typeof SwipeActions> = {
  title: 'DS/Actions/SwipeActions',
  component: SwipeActions,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof SwipeActions>;

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
  <div className="flex flex-col p-space-12 bg-surface select-none">
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

const InboxSampleRow = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="flex flex-col p-space-12 bg-surface select-none">
    <span className="font-bold text-body text-ink">{title}</span>
    <span className="text-caption text-ink-3 mt-space-2">{subtitle}</span>
  </div>
);

export const ApproveRevealed: Story = {
  name: 'ApproveRevealed',
  render: () => (
    <Card className="max-w-sm w-full overflow-hidden">
      <SwipeActions
        variant="transactions"
        revealed="left"
        onApprove={() => alert('Approved')}
      >
        <TransactionSampleRow
          merchant="Swiggy Bangalore"
          amount="1,249.00"
          account="HDFC Regalia ••7741"
          category="Food & dining"
          status="Duplicate"
        />
      </SwipeActions>
    </Card>
  ),
};

export const DeleteRevealed: Story = {
  name: 'DeleteRevealed',
  render: () => (
    <Card className="max-w-sm w-full overflow-hidden">
      <SwipeActions
        variant="transactions"
        revealed="right"
        onDelete={() => alert('Deleted')}
      >
        <TransactionSampleRow
          merchant="Uber India"
          amount="640.00"
          account="Amex Platinum ••1008 · Gmail"
          category="Transport"
        />
      </SwipeActions>
    </Card>
  ),
};

export const SnoozeRevealed: Story = {
  name: 'SnoozeRevealed',
  render: () => (
    <Card className="max-w-sm w-full overflow-hidden">
      <SwipeActions
        variant="inbox"
        revealed="left"
        onSnooze={() => alert('Snoozed until tomorrow')}
      >
        <InboxSampleRow
          title="SBI statement missing"
          subtitle="Inbox · until tomorrow"
        />
      </SwipeActions>
    </Card>
  ),
};

export const DismissRevealed: Story = {
  name: 'DismissRevealed',
  render: () => (
    <Card className="max-w-sm w-full overflow-hidden">
      <SwipeActions
        variant="inbox"
        revealed="right"
        onDismiss={() => alert('Dismissed')}
      >
        <InboxSampleRow title="Prices refreshed" subtitle="Inbox" />
      </SwipeActions>
    </Card>
  ),
};

const InteractiveSwipeDemo = () => {
  const [revealed, setRevealed] = useState<'left' | 'right' | 'none'>('none');

  return (
    <Card className="max-w-sm w-full overflow-hidden">
      <SwipeActions
        variant="transactions"
        revealed={revealed}
        onRevealedChange={setRevealed}
        onApprove={() => alert('Approved!')}
        onDelete={() => alert('Deleted!')}
      >
        <TransactionSampleRow
          merchant="Swiggy Bangalore"
          amount="1,249.00"
          account="HDFC Regalia ••7741"
          category="Food & dining"
          status="Duplicate"
        />
      </SwipeActions>
      <div className="p-space-8 text-center text-caption text-ink-4 bg-sunken">
        Swipe right to Approve · Swipe left to Delete
      </div>
    </Card>
  );
};

export const Interactive: Story = {
  name: 'Interactive',
  render: () => <InteractiveSwipeDemo />,
};

const NoApprovalDemo = () => {
  const [revealed, setRevealed] = useState<'left' | 'right' | 'none'>('none');

  return (
    <Card className="max-w-sm w-full overflow-hidden">
      <SwipeActions
        variant="transactions"
        canApprove={false}
        revealed={revealed}
        onRevealedChange={setRevealed}
        onDelete={() => alert('Deleted!')}
      >
        <TransactionSampleRow
          merchant="Verified Uber Ride"
          amount="340.00"
          account="ICICI Sapphiro ••9021"
          category="Transport"
        />
      </SwipeActions>
      <div className="p-space-8 text-center text-caption text-ink-4 bg-sunken">
        Row needs no approval: swiping right springs back; swipe left still deletes
      </div>
    </Card>
  );
};

export const NoApprovalSpringBack: Story = {
  name: 'NoApprovalSpringBack',
  render: () => <NoApprovalDemo />,
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-16 max-w-sm w-full">
      {/* Transactions Card matching preview.html */}
      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Transactions: right Approve · left Delete
        </h4>
        <Card className="overflow-hidden">
          <SwipeActions
            variant="transactions"
            revealed="left"
            className="border-t-0"
          >
            <TransactionSampleRow
              merchant="Swiggy Bangalore"
              amount="1,249.00"
              account="HDFC Regalia ••7741"
              category="Food & dining"
              status="Duplicate"
            />
          </SwipeActions>
          <SwipeActions
            variant="transactions"
            revealed="right"
          >
            <TransactionSampleRow
              merchant="Uber India"
              amount="640.00"
              account="Amex Platinum ••1008 · Gmail"
              category="Transport"
            />
          </SwipeActions>
        </Card>
      </div>

      {/* Inbox Card matching preview.html */}
      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Inbox: right Snooze · left Dismiss
        </h4>
        <Card className="overflow-hidden">
          <SwipeActions
            variant="inbox"
            revealed="left"
            className="border-t-0"
          >
            <InboxSampleRow
              title="SBI statement missing"
              subtitle="Inbox · until tomorrow"
            />
          </SwipeActions>
          <SwipeActions
            variant="inbox"
            revealed="right"
          >
            <InboxSampleRow title="Prices refreshed" subtitle="Inbox" />
          </SwipeActions>
        </Card>
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import { Check, Clock, Trash2, X } from 'lucide-react';
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
      <span className="font-bold text-body text-ink">{merchant}</span>
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
    <Card className="max-w-sm overflow-hidden">
      <SwipeActions
        revealed="left"
        leftAction={{
          label: 'Approve',
          icon: <Check className="w-space-20 h-space-20" />,
          tone: 'brand',
          onAction: () => alert('Approved'),
        }}
        rightAction={{
          label: 'Delete',
          icon: <Trash2 className="w-space-20 h-space-20" />,
          tone: 'danger',
        }}
      >
        <TransactionSampleRow
          merchant="Swiggy Bangalore"
          amount="₹ 1,249.00"
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
    <Card className="max-w-sm overflow-hidden">
      <SwipeActions
        revealed="right"
        leftAction={{
          label: 'Approve',
          icon: <Check className="w-space-20 h-space-20" />,
          tone: 'brand',
        }}
        rightAction={{
          label: 'Delete',
          icon: <Trash2 className="w-space-20 h-space-20" />,
          tone: 'danger',
          onAction: () => alert('Deleted'),
        }}
      >
        <TransactionSampleRow
          merchant="Uber India"
          amount="₹ 640.00"
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
    <Card className="max-w-sm overflow-hidden">
      <SwipeActions
        revealed="left"
        leftAction={{
          label: 'Snooze',
          icon: <Clock className="w-space-20 h-space-20" />,
          tone: 'brand',
          onAction: () => alert('Snoozed until tomorrow'),
        }}
        rightAction={{
          label: 'Dismiss',
          icon: <X className="w-space-20 h-space-20" />,
          tone: 'danger',
        }}
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
    <Card className="max-w-sm overflow-hidden">
      <SwipeActions
        revealed="right"
        leftAction={{
          label: 'Snooze',
          icon: <Clock className="w-space-20 h-space-20" />,
          tone: 'brand',
        }}
        rightAction={{
          label: 'Dismiss',
          icon: <X className="w-space-20 h-space-20" />,
          tone: 'danger',
          onAction: () => alert('Dismissed'),
        }}
      >
        <InboxSampleRow title="Prices refreshed" subtitle="Inbox" />
      </SwipeActions>
    </Card>
  ),
};

const InteractiveSwipeStory: React.FC = () => {
  const [revealed, setRevealed] = useState<'left' | 'right' | 'none'>('none');

  return (
    <Card className="max-w-sm overflow-hidden">
      <SwipeActions
        revealed={revealed}
        onRevealedChange={setRevealed}
        leftAction={{
          label: 'Approve',
          icon: <Check className="w-space-20 h-space-20" />,
          tone: 'brand',
          onAction: () => alert('Approved!'),
        }}
        rightAction={{
          label: 'Delete',
          icon: <Trash2 className="w-space-20 h-space-20" />,
          tone: 'danger',
          onAction: () => alert('Deleted!'),
        }}
      >
        <TransactionSampleRow
          merchant="Swiggy Bangalore"
          amount="₹ 1,249.00"
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
  render: () => <InteractiveSwipeStory />,
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-sm">
      <div>
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
          Swipe Right: Approve (Brand)
        </h4>
        <Card className="overflow-hidden">
          <SwipeActions
            revealed="left"
            leftAction={{
              label: 'Approve',
              icon: <Check className="w-space-20 h-space-20" />,
              tone: 'brand',
            }}
          >
            <TransactionSampleRow
              merchant="Swiggy Bangalore"
              amount="₹ 1,249.00"
              account="HDFC Regalia ••7741"
              category="Food & dining"
            />
          </SwipeActions>
        </Card>
      </div>

      <div>
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
          Swipe Left: Delete (Danger)
        </h4>
        <Card className="overflow-hidden">
          <SwipeActions
            revealed="right"
            rightAction={{
              label: 'Delete',
              icon: <Trash2 className="w-space-20 h-space-20" />,
              tone: 'danger',
            }}
          >
            <TransactionSampleRow
              merchant="Uber India"
              amount="₹ 640.00"
              account="Amex Platinum ••1008"
              category="Transport"
            />
          </SwipeActions>
        </Card>
      </div>

      <div>
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
          Inbox: Snooze & Dismiss
        </h4>
        <Card className="overflow-hidden">
          <SwipeActions
            revealed="left"
            leftAction={{
              label: 'Snooze',
              icon: <Clock className="w-space-20 h-space-20" />,
              tone: 'brand',
            }}
          >
            <InboxSampleRow
              title="SBI statement missing"
              subtitle="Inbox · until tomorrow"
            />
          </SwipeActions>
        </Card>
      </div>
    </div>
  ),
};

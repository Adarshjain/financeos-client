import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '../Card/Card';
import { Icon } from '../Icon/Icon';
import { ListRow } from '../ListRow/ListRow';
import { TransactionRow } from '../TransactionRow/TransactionRow';
import { SwipeActions } from './SwipeActions';

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
  },
};

export default meta;
type Story = StoryObj<typeof SwipeActions>;

const approveAction = {
  label: 'Approve',
  tone: 'brand' as const,
  icon: <Icon name="check" size="lg" />,
  onTrigger: () => alert('Approved'),
};

const deleteAction = {
  label: 'Delete',
  tone: 'danger' as const,
  icon: <Icon name="delete" size="lg" />,
  onTrigger: () => alert('Deleted'),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-sm w-full font-text">
      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Wrapping TransactionRow (selected tint preserved)
        </h4>
        <SwipeActions
          left={approveAction}
          right={deleteAction}
          className="rounded-ds-md"
        >
          <TransactionRow
            description="Swiggy Bangalore"
            amount="₹1,249.00"
            account="HDFC Regalia"
            selected
          />
        </SwipeActions>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Wrapping ListRow
        </h4>
        <div className="border border-line rounded-ds-lg overflow-hidden bg-surface">
          <SwipeActions left={approveAction} right={deleteAction}>
            <ListRow
              title="Quarterly Review Statement"
              subtitle="PDF · 4.2 MB"
              borderTop={false}
            />
          </SwipeActions>
        </div>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Wrapping Card (border and radius preserved)
        </h4>
        <SwipeActions
          left={approveAction}
          right={deleteAction}
          className="rounded-ds-lg"
        >
          <Card className="p-space-16 border border-line rounded-ds-lg bg-surface shadow-pop">
            <div className="font-extrabold text-body text-ink">
              Subscription renewal
            </div>
            <div className="text-caption text-ink-3">
              Netflix Premium · Renews in 2 days
            </div>
          </Card>
        </SwipeActions>
      </div>
    </div>
  ),
};

export const WrapTransactionRow: Story = {
  name: 'Wrapping TransactionRow',
  render: (args) => (
    <div className="max-w-sm w-full">
      <SwipeActions
        left={approveAction}
        right={deleteAction}
        {...args}
        className="rounded-ds-md"
      >
        <TransactionRow
          description="Swiggy Bangalore"
          amount="₹1,249.00"
          account="HDFC Regalia"
          selected
        />
      </SwipeActions>
    </div>
  ),
};

export const WrapListRow: Story = {
  name: 'Wrapping ListRow',
  render: (args) => (
    <div className="max-w-sm w-full border border-line rounded-ds-lg overflow-hidden bg-surface">
      <SwipeActions
        left={approveAction}
        right={deleteAction}
        {...args}
      >
        <ListRow
          title="Quarterly Review Statement"
          subtitle="PDF · 4.2 MB"
          borderTop={false}
        />
      </SwipeActions>
    </div>
  ),
};

export const WrapCard: Story = {
  name: 'Wrapping Card',
  render: (args) => (
    <div className="max-w-sm w-full">
      <SwipeActions
        left={approveAction}
        right={deleteAction}
        {...args}
        className="rounded-ds-lg"
      >
        <Card className="p-space-16 border border-line rounded-ds-lg bg-surface shadow-pop">
          <div className="font-extrabold text-body text-ink">
            Subscription renewal
          </div>
          <div className="text-caption text-ink-3">
            Netflix Premium · Renews in 2 days
          </div>
        </Card>
      </SwipeActions>
    </div>
  ),
};

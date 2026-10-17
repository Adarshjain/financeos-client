import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Card, Icon, ListRow, type SwipeActionItem, SwipeActions } from '@/components/ds';

const approveAction: SwipeActionItem = {
  label: 'Approve',
  tone: 'brand',
  icon: <Icon name="check" size="lg" />,
  onTrigger: fn(),
};

const deleteAction: SwipeActionItem = {
  label: 'Delete',
  tone: 'danger',
  icon: <Icon name="delete" size="lg" />,
  onTrigger: fn(),
};

const meta: Meta<typeof SwipeActions> = {
  title: 'DS/Actions/SwipeActions',
  component: SwipeActions,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm w-full">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disable swipe gesture on this row',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SwipeActions>;

export const WrapListRow: Story = {
  name: 'Wrapping ListRow',
  args: {
    left: approveAction,
    right: deleteAction,
    className: 'rounded-ds-lg',
    children: (
      <Card className="overflow-hidden">
        <ListRow
          title="Quarterly Review Statement"
          subtitle="PDF · 4.2 MB"
          borderTop={false}
        />
      </Card>
    ),
  },
};

export const WrapCard: Story = {
  name: 'Wrapping Card',
  args: {
    left: approveAction,
    right: deleteAction,
    className: 'rounded-ds-lg',
    children: (
      <Card>
        <ListRow
          title="Subscription renewal"
          subtitle="Renews in 2 days"
          borderTop={false}
        />
      </Card>
    ),
  },
};

export const LeftOnly: Story = {
  name: 'Left only',
  args: {
    left: approveAction,
    className: 'rounded-ds-lg',
    children: (
      <Card className="overflow-hidden">
        <ListRow
          title="Quarterly Review Statement"
          subtitle="PDF · 4.2 MB"
          borderTop={false}
        />
      </Card>
    ),
  },
};

export const RightOnly: Story = {
  name: 'Right only',
  args: {
    right: deleteAction,
    className: 'rounded-ds-lg',
    children: (
      <Card className="overflow-hidden">
        <ListRow
          title="Quarterly Review Statement"
          subtitle="PDF · 4.2 MB"
          borderTop={false}
        />
      </Card>
    ),
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  args: {
    disabled: true,
    left: approveAction,
    right: deleteAction,
    className: 'rounded-ds-lg',
    children: (
      <Card className="overflow-hidden">
        <ListRow
          title="Locked statement"
          subtitle="Cannot be modified"
          borderTop={false}
        />
      </Card>
    ),
  },
};

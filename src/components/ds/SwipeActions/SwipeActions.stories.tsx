import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '../Card/Card';
import { Icon } from '../Icon/Icon';
import { ListRow } from '../ListRow/ListRow';
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
    <div className="space-y-space-16 max-w-sm w-full font-text">
      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Both sides (swipe right Approve · swipe left Delete)
        </h4>
        <Card className="overflow-hidden p-0">
          <SwipeActions
            left={approveAction}
            right={deleteAction}
          >
            <div className="p-space-12 bg-surface">
              <div className="font-extrabold text-body text-ink">Swiggy Bangalore</div>
              <div className="text-caption text-ink-3">HDFC Regalia ••7741</div>
            </div>
          </SwipeActions>
        </Card>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Right only (Delete only)
        </h4>
        <Card className="overflow-hidden p-0">
          <SwipeActions right={deleteAction}>
            <div className="p-space-12 bg-surface">
              <div className="font-extrabold text-body text-ink">Uber India</div>
              <div className="text-caption text-ink-3">ICICI Amazon Pay ••9021</div>
            </div>
          </SwipeActions>
        </Card>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Left only (Approve only)
        </h4>
        <Card className="overflow-hidden p-0">
          <SwipeActions left={approveAction}>
            <div className="p-space-12 bg-surface">
              <div className="font-extrabold text-body text-ink">Starbucks Coffee</div>
              <div className="text-caption text-ink-3">HDFC Regalia ••7741</div>
            </div>
          </SwipeActions>
        </Card>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Disabled
        </h4>
        <Card className="overflow-hidden p-0">
          <SwipeActions disabled left={approveAction} right={deleteAction}>
            <div className="p-space-12 bg-surface">
              <div className="font-extrabold text-body text-ink">Amazon Pay</div>
              <div className="text-caption text-ink-3">ICICI Sapphiro ••9021</div>
            </div>
          </SwipeActions>
        </Card>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Wrapping a ListRow
        </h4>
        <Card className="overflow-hidden p-0">
          <SwipeActions left={approveAction} right={deleteAction}>
            <ListRow
              title="Quarterly Review Statement"
              subtitle="PDF · 4.2 MB"
              borderTop={false}
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
    left: approveAction,
    right: deleteAction,
  },
  render: (args) => (
    <Card className="max-w-sm w-full overflow-hidden p-0">
      <SwipeActions {...args}>
        <div className="p-space-12 bg-surface">
          <div className="font-extrabold text-body text-ink">Swiggy Bangalore</div>
          <div className="text-caption text-ink-3">HDFC Regalia ••7741</div>
        </div>
      </SwipeActions>
    </Card>
  ),
};

export const RightOnly: Story = {
  name: 'Right only',
  args: {
    right: deleteAction,
  },
  render: (args) => (
    <Card className="max-w-sm w-full overflow-hidden p-0">
      <SwipeActions {...args}>
        <div className="p-space-12 bg-surface">
          <div className="font-extrabold text-body text-ink">Uber India</div>
          <div className="text-caption text-ink-3">ICICI Amazon Pay ••9021</div>
        </div>
      </SwipeActions>
    </Card>
  ),
};

export const LeftOnly: Story = {
  name: 'Left only',
  args: {
    left: approveAction,
  },
  render: (args) => (
    <Card className="max-w-sm w-full overflow-hidden p-0">
      <SwipeActions {...args}>
        <div className="p-space-12 bg-surface">
          <div className="font-extrabold text-body text-ink">Starbucks Coffee</div>
          <div className="text-caption text-ink-3">HDFC Regalia ••7741</div>
        </div>
      </SwipeActions>
    </Card>
  ),
};

export const Disabled: Story = {
  name: 'Disabled',
  args: {
    disabled: true,
    left: approveAction,
    right: deleteAction,
  },
  render: (args) => (
    <Card className="max-w-sm w-full overflow-hidden p-0">
      <SwipeActions {...args}>
        <div className="p-space-12 bg-surface">
          <div className="font-extrabold text-body text-ink">Amazon Pay</div>
          <div className="text-caption text-ink-3">ICICI Sapphiro ••9021</div>
        </div>
      </SwipeActions>
    </Card>
  ),
};

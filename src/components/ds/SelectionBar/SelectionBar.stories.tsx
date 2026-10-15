import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';

import { Icon } from '../Icon/Icon';
import { SelectionBar, SelectionBarAction } from './SelectionBar';

const transactionActions: SelectionBarAction[] = [
  {
    label: 'Link',
    icon: <Icon name="link" size="sm" />,
    onClick: () => alert('Link clicked'),
  },
  {
    label: 'Merge',
    icon: <Icon name="merge" size="sm" />,
    hint: 'the pair',
    onClick: () => alert('Merge clicked'),
  },
  {
    label: 'Approve',
    icon: <Icon name="check" size="sm" />,
    hint: 'clear Duplicate',
    count: 2,
    onClick: () => alert('Approve clicked'),
  },
  {
    label: 'Delete',
    icon: <Icon name="delete" size="sm" />,
    variant: 'danger',
    onClick: () => alert('Delete clicked'),
  },
];

const meta: Meta<typeof SelectionBar> = {
  title: 'DS/Actions/SelectionBar',
  component: SelectionBar,
  parameters: {
    layout: 'padded',
  },
  args: {
    count: 2,
    actions: transactionActions,
    onClear: () => {},
  },
  argTypes: {
    count: {
      control: 'number',
    },
    summary: {
      control: 'text',
    },
    selectAllLabel: {
      control: 'text',
    },
  },
  render: function Render(args) {
    const [{ count }, updateArgs] = useArgs();
    return (
      <div className="flex justify-center w-full">
        <SelectionBar
          {...args}
          count={count ?? args.count}
          onClear={() => {
            args.onClear?.();
            updateArgs({ count: 0 });
          }}
          onSelectAll={() => {
            args.onSelectAll?.();
            updateArgs({ count: 182 });
          }}
        />
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof SelectionBar>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-2xl font-text">
      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Four Actions (Transactions)
        </h4>
        <SelectionBar
          count={2}
          summary="₹ 2,498 · the duplicate pair"
          actions={transactionActions}
          onClear={() => {}}
        />
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Single Action (Rules)
        </h4>
        <div className="max-w-sm">
          <SelectionBar
            count={2}
            summary="unverified rules"
            actions={[
              {
                label: 'Approve',
                icon: <Icon name="check" size="sm" />,
                hint: 'mark verified',
              },
            ]}
            onClear={() => {}}
            onSelectAll={() => {}}
            selectAllLabel="Select all on page"
          />
        </div>
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Disabled Action
        </h4>
        <SelectionBar
          count={3}
          summary="Merge needs exactly 2"
          actions={[
            {
              label: 'Merge',
              icon: <Icon name="merge" size="sm" />,
              disabled: true,
            },
            {
              label: 'Approve',
              icon: <Icon name="check" size="sm" />,
              count: 3,
            },
          ]}
          onClear={() => {}}
        />
      </div>
    </div>
  ),
};

export const Desktop: Story = {
  name: 'Desktop',
  args: {
    count: 2,
    summary: '₹ 2,498 · the duplicate pair',
    actions: transactionActions,
  },
};

export const PhoneDocked: Story = {
  name: 'Phone · docked',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  args: {
    count: 2,
    summary: '₹ 2,498 · the duplicate pair',
    actions: transactionActions,
    selectAllLabel: 'Select all 182',
  },
};

export const SingleAction: Story = {
  name: 'Single action (rules)',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  args: {
    count: 2,
    summary: 'unverified rules',
    selectAllLabel: 'Select all on page',
    actions: [
      {
        label: 'Approve',
        icon: <Icon name="check" size="md" />,
        hint: 'mark verified',
        onClick: () => alert('Approve rules'),
      },
    ],
  },
};

export const ActionDisabled: Story = {
  name: 'Action not available',
  args: {
    count: 3,
    summary: 'Merge needs exactly 2',
    actions: [
      {
        label: 'Merge',
        icon: <Icon name="merge" size="md" />,
        disabled: true,
      },
      {
        label: 'Approve',
        icon: <Icon name="check" size="md" />,
        count: 3,
        onClick: () => alert('Approve 3'),
      },
    ],
  },
};

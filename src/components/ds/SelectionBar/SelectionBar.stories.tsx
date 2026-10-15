import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { SelectionBar, SelectionBarAction } from './SelectionBar';

const meta: Meta<typeof SelectionBar> = {
  title: 'DS/Actions/SelectionBar',
  component: SelectionBar,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['desktop', 'phone', 'auto'],
    },
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
};

export default meta;
type Story = StoryObj<typeof SelectionBar>;

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

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-2xl">
      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Desktop Pill
        </h4>
        <SelectionBar
          variant="desktop"
          count={2}
          summary="₹ 2,498 · the duplicate pair"
          actions={transactionActions}
          onClear={() => {}}
        />
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Phone Docked
        </h4>
        <div className="max-w-sm">
          <SelectionBar
            variant="phone"
            count={2}
            summary="₹ 2,498 · the duplicate pair"
            actions={transactionActions}
            onClear={() => {}}
            onSelectAll={() => {}}
            selectAllLabel="Select all 182"
          />
        </div>
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Single Action (Rules)
        </h4>
        <div className="max-w-sm">
          <SelectionBar
            variant="phone"
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
          variant="desktop"
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
  render: () => (
    <div className="bg-canvas p-space-24 rounded-ds-lg flex justify-center">
      <SelectionBar
        variant="desktop"
        count={2}
        summary="₹ 2,498 · the duplicate pair"
        actions={transactionActions}
        onClear={() => alert('Clear')}
      />
    </div>
  ),
};

export const PhoneDocked: Story = {
  name: 'Phone · docked',
  render: () => (
    <div className="max-w-sm bg-canvas p-space-16 rounded-ds-lg">
      <SelectionBar
        variant="phone"
        count={2}
        summary="₹ 2,498 · the duplicate pair"
        actions={transactionActions}
        onClear={() => alert('Clear')}
        onSelectAll={() => alert('Select all')}
        selectAllLabel="Select all 182"
      />
    </div>
  ),
};

export const SingleAction: Story = {
  name: 'Single action (rules)',
  render: () => (
    <div className="max-w-sm bg-canvas p-space-16 rounded-ds-lg">
      <SelectionBar
        variant="phone"
        count={2}
        summary="unverified rules"
        actions={[
          {
            label: 'Approve',
            icon: <Icon name="check" size="md" />,
            hint: 'mark verified',
            onClick: () => alert('Approve rules'),
          },
        ]}
        onClear={() => alert('Clear')}
        onSelectAll={() => alert('Select all')}
        selectAllLabel="Select all on page"
      />
    </div>
  ),
};

export const ActionDisabled: Story = {
  name: 'Action not available',
  render: () => (
    <div className="bg-canvas p-space-24 rounded-ds-lg flex justify-center">
      <SelectionBar
        variant="desktop"
        count={3}
        summary="Merge needs exactly 2"
        actions={[
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
        ]}
        onClear={() => alert('Clear')}
      />
    </div>
  ),
};

const InteractiveSelectionStory: React.FC = () => {
  const [selectedCount, setSelectedCount] = useState(2);

  return (
    <div className="space-y-space-16 max-w-xl">
      <div className="flex gap-space-8">
        <Button size="sm" onClick={() => setSelectedCount(2)}>
          Select 2 (Duplicate pair)
        </Button>
        <Button size="sm" onClick={() => setSelectedCount(3)}>
          Select 3
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setSelectedCount(0)}>
          Clear
        </Button>
      </div>

      <div className="bg-canvas p-space-20 rounded-ds-lg flex justify-center">
        {selectedCount > 0 ? (
          <SelectionBar
            count={selectedCount}
            summary={
              selectedCount === 2
                ? '₹ 2,498 · the duplicate pair'
                : 'Merge needs exactly 2'
            }
            actions={[
              {
                label: 'Link',
                icon: <Icon name="link" size="md" />,
                onClick: () => alert('Link'),
              },
              {
                label: 'Merge',
                icon: <Icon name="merge" size="md" />,
                disabled: selectedCount !== 2,
                hint: 'the pair',
                onClick: () => alert('Merge'),
              },
              {
                label: 'Approve',
                icon: <Icon name="check" size="md" />,
                count: selectedCount,
                hint: 'clear Duplicate',
                onClick: () => alert('Approve'),
              },
              {
                label: 'Delete',
                icon: <Icon name="delete" size="md" />,
                variant: 'danger',
                onClick: () => alert('Delete'),
              },
            ]}
            onClear={() => setSelectedCount(0)}
            onSelectAll={() => setSelectedCount(182)}
            selectAllLabel="Select all 182"
          />
        ) : (
          <div className="text-label text-ink-3">No items selected.</div>
        )}
      </div>
    </div>
  );
};

export const Interactive: Story = {
  name: 'Interactive',
  render: () => <InteractiveSelectionStory />,
};

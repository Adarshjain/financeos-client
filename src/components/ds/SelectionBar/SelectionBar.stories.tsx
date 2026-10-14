import type { Meta, StoryObj } from '@storybook/react';
import { Check, GitMerge, Link2, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '../Button/Button';
import { SelectionBar, SelectionBarAction } from './SelectionBar';

const meta: Meta<typeof SelectionBar> = {
  title: 'DS/Actions/SelectionBar',
  component: SelectionBar,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof SelectionBar>;

const transactionActions: SelectionBarAction[] = [
  {
    label: 'Link',
    icon: <Link2 className="w-space-16 h-space-16" />,
    onClick: () => alert('Link clicked'),
  },
  {
    label: 'Merge',
    icon: <GitMerge className="w-space-16 h-space-16" />,
    hint: 'the pair',
    onClick: () => alert('Merge clicked'),
  },
  {
    label: 'Approve',
    icon: <Check className="w-space-16 h-space-16" />,
    hint: 'clear Duplicate',
    count: 2,
    onClick: () => alert('Approve clicked'),
  },
  {
    label: 'Delete',
    icon: <Trash2 className="w-space-16 h-space-16" />,
    variant: 'danger',
    onClick: () => alert('Delete clicked'),
  },
];

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
            icon: <Check className="w-space-16 h-space-16" />,
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
            icon: <GitMerge className="w-space-16 h-space-16" />,
            disabled: true,
          },
          {
            label: 'Approve',
            icon: <Check className="w-space-16 h-space-16" />,
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
                icon: <Link2 className="w-space-16 h-space-16" />,
                onClick: () => alert('Link'),
              },
              {
                label: 'Merge',
                icon: <GitMerge className="w-space-16 h-space-16" />,
                disabled: selectedCount !== 2,
                hint: 'the pair',
                onClick: () => alert('Merge'),
              },
              {
                label: 'Approve',
                icon: <Check className="w-space-16 h-space-16" />,
                count: selectedCount,
                hint: 'clear Duplicate',
                onClick: () => alert('Approve'),
              },
              {
                label: 'Delete',
                icon: <Trash2 className="w-space-16 h-space-16" />,
                variant: 'danger',
                onClick: () => alert('Delete'),
              },
            ]}
            onClear={() => setSelectedCount(0)}
            onSelectAll={() => setSelectedCount(182)}
            selectAllLabel="Select all 182"
          />
        ) : (
          <div className="text-small text-ink-3">No items selected.</div>
        )}
      </div>
    </div>
  );
};

export const Interactive: Story = {
  name: 'Interactive',
  render: () => <InteractiveSelectionStory />,
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-2xl">
      <div>
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
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
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
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
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
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
                icon: <Check className="w-space-16 h-space-16" />,
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
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
          Disabled Action
        </h4>
        <SelectionBar
          variant="desktop"
          count={3}
          summary="Merge needs exactly 2"
          actions={[
            {
              label: 'Merge',
              icon: <GitMerge className="w-space-16 h-space-16" />,
              disabled: true,
            },
            {
              label: 'Approve',
              icon: <Check className="w-space-16 h-space-16" />,
              count: 3,
            },
          ]}
          onClear={() => {}}
        />
      </div>
    </div>
  ),
};

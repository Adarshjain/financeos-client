import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Kbd } from './Kbd';

const meta = {
  title: 'DS/Data display/Kbd',
  component: Kbd,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Key symbol or combination',
    },
  },
  render: (args) => <Kbd {...args} />,
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-lg font-text">
      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          Single keys
        </h3>
        <div className="flex items-center gap-space-8">
          <Kbd>J</Kbd>
          <Kbd>K</Kbd>
          <Kbd>X</Kbd>
          <Kbd>Esc</Kbd>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          Compound keys
        </h3>
        <div className="flex items-center gap-space-8">
          <Kbd>⌘N</Kbd>
          <Kbd>⌘K</Kbd>
          <Kbd>⇧⌘P</Kbd>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          Shortcuts hint line
        </h3>
        <div className="p-space-12 rounded-ds-lg border border-line bg-surface font-text text-caption text-ink-3 flex items-center gap-space-4">
          <Kbd>J</Kbd> <Kbd>K</Kbd> move, <Kbd>X</Kbd> select
        </div>
      </div>
    </div>
  ),
};

export const SingleKey: Story = {
  name: 'Single key',
  args: {
    children: 'J',
  },
};

export const CompoundKey: Story = {
  name: 'Compound key',
  args: {
    children: '⌘K',
  },
};

export const InSentence: Story = {
  name: 'In sentence',
  args: {
    children: 'Esc',
  },
  render: (args) => (
    <div className="font-text text-caption text-ink-3 flex items-center gap-space-4">
      Press <Kbd {...args} /> to cancel
    </div>
  ),
};

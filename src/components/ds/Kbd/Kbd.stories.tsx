import type { Meta, StoryObj } from '@storybook/react';

import { Kbd } from './Kbd';

const meta: Meta<typeof Kbd> = {
  title: 'DS/Data display/Kbd',
  component: Kbd,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const SingleKey: Story = {
  render: () => (
    <div className="flex items-center gap-space-8">
      <Kbd>J</Kbd>
      <Kbd>K</Kbd>
      <Kbd>X</Kbd>
      <Kbd>Esc</Kbd>
    </div>
  ),
};

export const CompoundKey: Story = {
  render: () => (
    <div className="flex items-center gap-space-8">
      <Kbd>⌘N</Kbd>
      <Kbd>⌘K</Kbd>
      <Kbd>⇧⌘P</Kbd>
    </div>
  ),
};

export const InSentence: Story = {
  render: () => (
    <div className="font-text text-caption text-ink-3 flex items-center gap-space-4">
      <Kbd>J</Kbd> <Kbd>K</Kbd> move, <Kbd>X</Kbd> select
    </div>
  ),
};

export const AllVariants: Story = {
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

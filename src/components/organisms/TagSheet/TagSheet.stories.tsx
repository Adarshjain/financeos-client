import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { TagSheet } from '@/components/organisms';

const TAGS = [
  { id: 'tag-1', name: 'Goa trip', transactionCount: 14 },
  { id: 'tag-2', name: 'Office lunch', transactionCount: 9 },
  { id: 'tag-3', name: 'Reimbursable', transactionCount: 6 },
  { id: 'tag-4', name: 'Gifts', transactionCount: 3 },
  { id: 'tag-5', name: 'Tax saving', transactionCount: 0 },
];

const meta: Meta<typeof TagSheet> = {
  title: 'Organisms/TagSheet',
  component: TagSheet,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    tags: TAGS,
    value: ['tag-1'],
    title: 'Tags',
    subtitle: 'Swiggy · ₹486.00',
    onValueChange: fn(),
    onOpenChange: fn(),
    onCreate: fn(),
    onRename: fn(),
    onDelete: fn(),
  },
  argTypes: {
    open: { control: 'boolean' },
    tags: { control: 'object' },
    value: { control: 'object' },
    title: { control: 'text' },
    subtitle: { control: 'text' },
    creating: { control: 'boolean' },
    managing: { control: 'boolean' },
    initialQuery: { control: 'text' },
    initialManaging: { control: 'boolean' },
    onValueChange: { control: false },
    onOpenChange: { control: false },
    onCreate: { control: false },
    onRename: { control: false },
    onDelete: { control: false },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <TagSheet
        {...args}
        onValueChange={(value) => {
          args.onValueChange?.(value);
          updateArgs({ value });
        }}
        onOpenChange={(open) => {
          args.onOpenChange?.(open);
          updateArgs({ open });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof TagSheet>;

/** "goa" typed: the matching tag ticked, a Create "goa" row offered when no tag has that name. */
export const TickAndCreate: Story = { args: { initialQuery: 'goa trip 2' } };

/** Manage inside the sheet: every tag with Rename and Delete. */
export const Manage: Story = { args: { initialManaging: true } };

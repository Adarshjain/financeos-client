import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { TagNameDialog } from '@/components/organisms';

const meta: Meta<typeof TagNameDialog> = {
  title: 'Organisms/TagNameDialog',
  component: TagNameDialog,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    title: 'New tag',
    submitLabel: 'Add tag',
    onSubmit: fn(),
    onOpenChange: fn(),
  },
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    initialName: { control: 'text' },
    submitLabel: { control: 'text' },
    loading: { control: 'boolean' },
    error: { control: 'text' },
    onSubmit: { control: false },
    onOpenChange: { control: false },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <TagNameDialog
        {...args}
        onOpenChange={(open) => {
          args.onOpenChange?.(open);
          updateArgs({ open });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof TagNameDialog>;

export const NewTag: Story = {};

export const RenameTag: Story = { args: { title: 'Rename tag', submitLabel: 'Save name', initialName: 'Goa trip' } };

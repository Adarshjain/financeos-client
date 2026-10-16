import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { TextArea } from '@/components/ds';

const meta: Meta<typeof TextArea> = {
  title: 'DS/Inputs/TextArea',
  component: TextArea,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A labelled multi-line field for notes and descriptions.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md w-full">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    defaultValue: { control: 'text' },
    value: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
    optional: { control: 'boolean' },
    disabled: { control: 'boolean' },
    rows: { control: 'number' },
    minRows: { control: 'number' },
    maxRows: { control: 'number' },
    controlClassName: { control: 'text' },
    onValueChange: { control: false },
    onChange: { control: false },
  },
  args: {
    onValueChange: fn(),
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <TextArea
        {...args}
        value={value ?? args.defaultValue}
        onValueChange={(v) => {
          args.onValueChange?.(v);
          updateArgs({ value: v });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
  args: {
    label: 'Note',
    placeholder: 'Add a note…',
  },
};

export const Filled: Story = {
  args: {
    label: 'Note',
    defaultValue: 'Split with Priya.\nShe owes half by Friday.\nSettle on UPI.',
  },
};

export const Optional: Story = {
  args: {
    label: 'Description',
    optional: true,
    placeholder: 'Optional remarks',
  },
};

export const WithHelper: Story = {
  args: {
    label: 'Description',
    defaultValue: 'Quarterly tax reconciliation and GST filing notes for October.',
    helper: 'Visible on shared reports and export sheets.',
  },
};

export const MaxRows: Story = {
  args: {
    label: 'Note',
    maxRows: 3,
    defaultValue:
      'Line 1: Itemized expense\nLine 2: Client meeting at cafe\nLine 3: Receipt attached\nLine 4: Pending manager signoff\nLine 5: Archive copy',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Note',
    defaultValue: 'Split with Priya, she owes half',
    error: 'Note cannot exceed 500 characters.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'System notes',
    defaultValue: 'Auto-generated note by statement parser.',
    disabled: true,
  },
};


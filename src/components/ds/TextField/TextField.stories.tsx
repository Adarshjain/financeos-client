import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { TextField } from '@/components/ds';

const meta: Meta<typeof TextField> = {
  title: 'DS/Form fields/TextField',
  component: TextField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A labelled single-line input. Label above in ink-2 12px bold; helper or error below.',
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
    type: {
      control: 'select',
      options: ['text', 'password', 'number', 'email'],
    },
    inputMode: {
      control: 'select',
      options: ['text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'],
    },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    defaultValue: { control: 'text' },
    value: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
    optional: { control: 'boolean' },
    disabled: { control: 'boolean' },
    prefix: { control: 'text' },
    suffix: { control: 'text' },
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
      <TextField
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
type Story = StoryObj<typeof TextField>;

export const Filled: Story = {
  args: {
    label: 'Account name',
    defaultValue: 'HDFC Regalia Gold',
  },
};

export const Placeholder: Story = {
  args: {
    label: 'MCC code',
    placeholder: 'e.g. 5812',
  },
};

export const Optional: Story = {
  args: {
    label: 'Description',
    optional: true,
    placeholder: 'Personal notes',
  },
};

export const WithPrefix: Story = {
  args: {
    label: 'Total due',
    prefix: '₹',
    inputMode: 'decimal',
    defaultValue: '44,319.00',
  },
};

export const Password: Story = {
  args: {
    label: 'Statement password',
    type: 'password',
    defaultValue: 'Secret123',
  },
};

export const WithHelper: Story = {
  args: {
    label: 'Import emails from',
    placeholder: '01/04/2026',
    helper: 'Leave empty to pause Gmail import.',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Last 4 digits',
    defaultValue: '77',
    error: 'Enter the last 4 digits of the card.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Account',
    defaultValue: 'HDFC Regalia ••7741',
    disabled: true,
  },
};


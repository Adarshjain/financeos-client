import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Icon, TextField } from '@/components/ds';

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
    size: {
      control: 'select',
      options: ['md', 'lg', 'xl'],
    },
    align: {
      control: 'select',
      options: ['left', 'right'],
    },
    variant: {
      control: 'select',
      options: ['default', 'embedded'],
    },
    type: {
      control: 'select',
      options: ['text', 'password', 'number', 'email', 'search'],
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
    clearable: { control: 'boolean' },
    clearLabel: { control: 'text' },
    prefix: { control: 'text' },
    suffix: { control: 'text' },
    controlClassName: { control: 'text' },
    onValueChange: { control: false },
    onChange: { control: false },
    onClear: { control: false },
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

export const LargeRightAligned: Story = {
  args: {
    size: 'xl',
    align: 'right',
    prefix: '₹',
    inputMode: 'decimal',
    placeholder: '0.00',
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

export const Search: Story = {
  args: {
    type: 'search',
    size: 'lg',
    prefix: <Icon name="search" size="sm" />,
    clearable: true,
    clearLabel: 'Clear search',
    placeholder: 'Search…',
  },
};

export const SearchSmall: Story = {
  args: {
    type: 'search',
    size: 'md',
    prefix: <Icon name="search" size="sm" />,
    clearable: true,
    clearLabel: 'Clear search',
    placeholder: 'Search…',
  },
};

export const Embedded: Story = {
  args: {
    type: 'search',
    size: 'md',
    variant: 'embedded',
    prefix: <Icon name="search" size="sm" />,
    clearable: true,
    clearLabel: 'Clear search',
    placeholder: 'Search options…',
  },
};

export const Clearable: Story = {
  args: {
    label: 'Filter merchant',
    defaultValue: 'Swiggy',
    clearable: true,
    clearLabel: 'Clear',
  },
};


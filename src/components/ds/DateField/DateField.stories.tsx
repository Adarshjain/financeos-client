import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { DateField } from '@/components/ds';

const meta: Meta<typeof DateField> = {
  title: 'DS/Inputs/DateField',
  component: DateField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The date and date range input field with Popover calendar picker.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  args: {
    onValueChange: fn(),
    onOpenChange: fn(),
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    defaultValue: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
    optional: { control: 'boolean' },
    disabled: { control: 'boolean' },
    range: { control: 'boolean' },
    minDate: { control: 'text' },
    maxDate: { control: 'text' },
    today: { control: 'text' },
    open: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <DateField
        {...args}
        value={value ?? args.defaultValue}
        onValueChange={(val) => {
          updateArgs({ value: val });
          args.onValueChange?.(val);
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof DateField>;

export const Default: Story = {
  args: {
    label: 'Due date',
    defaultValue: '2026-10-25',
  },
};

export const Range: Story = {
  args: {
    range: true,
    label: 'Period',
    defaultValue: { start: '2026-10-01', end: '2026-10-13' },
  },
};

export const WithMinMax: Story = {
  args: {
    label: 'Travel date',
    defaultValue: '2026-10-15',
    minDate: '2026-10-10',
    maxDate: '2026-10-25',
    helper: 'Selection restricted between 10/10/2026 and 25/10/2026.',
  },
};

export const OpenCalendar: Story = {
  args: {
    label: 'Open calendar picker',
    defaultValue: '2026-10-15',
    defaultOpen: true,
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Statement date',
    defaultValue: '2026-10-15',
    error: 'Enter a valid date in dd/mm/yyyy format.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Locked cycle date',
    defaultValue: '2026-10-01',
    disabled: true,
  },
};

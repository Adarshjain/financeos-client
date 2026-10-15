import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';

import { DateField } from './DateField';

const meta: Meta<typeof DateField> = {
  title: 'DS/Inputs/DateField',
  component: DateField,
  parameters: {
    layout: 'padded',
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
    defaultStartDate: { control: 'text' },
    defaultEndDate: { control: 'text' },
    minDate: { control: 'text' },
    maxDate: { control: 'text' },
  },
  render: function Render(args) {
    const [{ value, startDate, endDate }, updateArgs] = useArgs();
    return (
      <DateField
        {...args}
        value={value}
        startDate={startDate}
        endDate={endDate}
        onChange={(val) => updateArgs({ value: val })}
        onRangeChange={(range) => updateArgs({ startDate: range.startDate, endDate: range.endDate })}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof DateField>;

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-lg font-text">
      <DateField
        label="Due date"
        defaultValue="25/10/2026"
      />
      <DateField
        range
        label="Period"
        defaultStartDate="01/10/2026"
        defaultEndDate="13/10/2026"
      />
      <DateField
        label="Travel dates"
        defaultValue="15/10/2026"
        minDate="10/10/2026"
        maxDate="25/10/2026"
        helper="Selection restricted between 10/10/2026 and 25/10/2026."
      />
      <DateField
        label="Statement date"
        defaultValue="32/13/2026"
        error="Enter a valid date in dd/mm/yyyy format."
      />
      <DateField
        label="Locked cycle date"
        defaultValue="01/10/2026"
        disabled
      />
    </div>
  ),
};

export const Single: Story = {
  args: {
    label: 'Due date',
    defaultValue: '25/10/2026',
  },
};

export const Range: Story = {
  args: {
    range: true,
    label: 'Period',
    defaultStartDate: '01/10/2026',
    defaultEndDate: '13/10/2026',
  },
};

export const WithMinMax: Story = {
  args: {
    label: 'Travel date',
    defaultValue: '15/10/2026',
    minDate: '10/10/2026',
    maxDate: '25/10/2026',
    helper: 'Selection restricted between 10/10/2026 and 25/10/2026.',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Statement date',
    defaultValue: '32/13/2026',
    error: 'Enter a valid date in dd/mm/yyyy format.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Locked cycle date',
    defaultValue: '01/10/2026',
    disabled: true,
  },
};

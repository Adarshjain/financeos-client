import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Icon, SegmentedControl } from '@/components/ds';

const meta: Meta<typeof SegmentedControl> = {
  title: 'DS/Inputs/SegmentedControl',
  component: SegmentedControl,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Two to four mutually exclusive views of the same content, shown side by side: Debit | Credit, List | Calendar.',
      },
    },
  },
  args: {
    options: ['Debit', 'Credit'],
    onValueChange: fn(),
  },
  argTypes: {
    options: { control: false },
    value: { control: 'text' },
    defaultValue: { control: 'text' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    onValueChange: { control: false },
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <SegmentedControl
        {...args}
        value={value ?? args.value}
        onValueChange={(val) => {
          args.onValueChange?.(val);
          updateArgs({ value: val });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const TwoOptions: Story = {
  args: {
    options: ['Debit', 'Credit'],
    value: 'Debit',
  },
};

export const ThreeOptions: Story = {
  args: {
    options: ['Preset', 'Single date', 'Range'],
    value: 'Preset',
  },
};

export const Disabled: Story = {
  args: {
    options: ['Debit', 'Credit'],
    value: 'Debit',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    options: ['Debit', 'Credit'],
    value: 'Debit',
    fullWidth: true,
  },
};

export const WithIcons: Story = {
  args: {
    options: [
      { value: 'list', label: 'List', icon: <Icon name="list-bullets" /> },
      { value: 'calendar', label: 'Calendar', icon: <Icon name="calendar" /> },
    ],
    value: 'list',
  },
};

export const DisabledOption: Story = {
  args: {
    options: [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'archived', label: 'Archived', disabled: true },
    ],
    value: 'all',
  },
};

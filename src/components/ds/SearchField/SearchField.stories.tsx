import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { SearchField } from '@/components/ds';

const meta: Meta<typeof SearchField> = {
  title: 'DS/Form fields/SearchField',
  component: SearchField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A search box with a leading magnifier. Every search input carries the icon.',
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
      options: ['md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['default', 'embedded'],
    },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    defaultValue: { control: 'text' },
    value: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
    clearable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    controlClassName: { control: 'text' },
    onValueChange: { control: false },
    onClear: { control: false },
  },
  args: {
    onValueChange: fn(),
    onClear: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SearchField>;

export const Default: Story = {
  args: {
    placeholder: 'Search merchant keys or names…',
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'swiggy',
    placeholder: 'Search merchant keys or names…',
  },
};

export const Labelled: Story = {
  args: {
    size: 'lg',
    label: 'Find the other side',
    placeholder: 'Amount, merchant or date',
  },
};

export const WithHelper: Story = {
  args: {
    defaultValue: 'xyz',
    placeholder: 'Search merchant keys or names…',
    helper: 'No transactions match "xyz".',
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: 'disabled search',
    disabled: true,
  },
};



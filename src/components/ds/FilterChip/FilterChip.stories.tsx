import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { ConcealProvider, FilterChip, Select } from '@/components/ds';

const meta: Meta<typeof FilterChip> = {
  title: 'DS/Form fields/FilterChip',
  component: FilterChip,
  decorators: [
    (Story) => (
      <div className="p-space-16">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    selected: { control: { type: 'boolean' } },
    variant: {
      control: { type: 'select' },
      options: ['outline', 'soft', 'dashed'],
    },
    tone: {
      control: { type: 'select' },
      options: ['brand', 'warning', 'neutral'],
    },
    size: { control: { type: 'select' }, options: ['sm', 'md'] },
    shape: { control: { type: 'select' }, options: ['pill', 'rounded'] },
    hasDropdown: { control: { type: 'boolean' } },
    removable: { control: { type: 'boolean' } },
    count: { control: { type: 'number' } },
    disabled: { control: { type: 'boolean' } },
  },
  args: {
    children: 'Category',
    onSelectedChange: fn(),
    onRemove: fn(),
  },
  parameters: {
    layout: 'padded',
  },
  render: function Render(args) {
    const [{ selected }, updateArgs] = useArgs();
    return (
      <FilterChip
        {...args}
        selected={selected}
        onSelectedChange={(val) => {
          updateArgs({ selected: val });
          args.onSelectedChange?.(val);
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof FilterChip>;

export const Default: Story = {
  args: {
    children: 'Category',
    selected: false,
    hasDropdown: false,
  },
};

export const WithDropdown: Story = {
  name: 'With dropdown',
  args: {
    children: 'Category',
    selected: false,
    hasDropdown: true,
  },
};

export const Selected: Story = {
  args: {
    children: 'All · 64',
    selected: true,
  },
};

export const WarningTone: Story = {
  name: 'Warning tone',
  args: {
    children: 'Needs review · 25',
    selected: true,
    tone: 'warning',
    removable: true,
  },
};

export const Dashed: Story = {
  args: {
    children: '+ More',
    variant: 'dashed',
  },
};

export const WithCount: Story = {
  name: 'With count',
  args: {
    children: 'Category',
    count: 3,
    selected: false,
  },
};

export const Removable: Story = {
  args: {
    children: 'This year',
    selected: true,
    removable: true,
  },
};

export const FieldSized: Story = {
  name: 'Field sized',
  args: {
    children: 'Category',
    size: 'md',
    shape: 'rounded',
    hasDropdown: true,
    selected: true,
    removable: true,
  },
};

export const WithSelectDropdown: Story = {
  name: 'With select dropdown',
  render: () => (
    <Select
      options={[
        { value: 'option-a', label: 'Option A' },
        { value: 'option-b', label: 'Option B' },
        { value: 'option-c', label: 'Option C' },
      ]}
      defaultValue={['option-a', 'option-b']}
      multiple
      searchable
      searchPlaceholder="Search options"
      trigger={
        <FilterChip selected hasDropdown>
          Account · 2
        </FilterChip>
      }
    />
  ),
};

export const Concealed: Story = {
  ...Default,
  args: { ...Default.args, children: 'Amount ≥ ₹500' },
  decorators: [
    (Story) => (
      <ConcealProvider concealed>
        <Story />
      </ConcealProvider>
    ),
  ],
  parameters: {
    docs: { description: { story: 'While amounts are hidden (ConcealProvider), every ₹ amount reads "₹ —".' } },
  },
};

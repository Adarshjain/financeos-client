import type { Meta, StoryObj } from '@storybook/react';

import { ProgressBar } from '@/components/ds';

const meta: Meta<typeof ProgressBar> = {
  title: 'DS/Data display/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A 6px track (line-soft) with a rounded fill in brand, warning, or danger.',
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
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    tone: {
      control: 'select',
      options: ['brand', 'warning', 'danger'],
    },
    color: {
      control: 'select',
      options: [undefined, 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-rest'],
    },
    label: { control: 'text' },
    segments: { control: 'object' },
  },
  args: {
    value: 21,
    min: 0,
    max: 100,
    tone: 'brand',
    label: '21% · 152 days left',
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Brand: Story = {
  args: {
    value: 21,
    tone: 'brand',
    label: '21% · 152 days left',
  },
};

export const Warning: Story = {
  args: {
    value: 62,
    tone: 'warning',
    label: '62% of budget · ₹93,000 spent',
  },
};

export const Danger: Story = {
  args: {
    value: 108,
    tone: 'danger',
    label: '108% · over by ₹12,400',
  },
};

export const ChartColour: Story = {
  args: {
    value: 46,
    color: 'chart-2',
    label: '46% · Groceries ₹42,500 of ₹92,000',
  },
};

export const Empty: Story = {
  args: {
    value: 0,
    tone: 'brand',
    label: '0% of ₹2,00,000 used',
  },
};

export const Indeterminate: Story = {
  args: {
    value: undefined,
    tone: 'brand',
    label: 'Calculating…',
  },
};

export const Split: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Split form: flush segments, 8px high. `value` and `tone` are ignored. Always shown with a Legend.',
      },
    },
  },
  args: {
    segments: [
      { value: 3_55_000, label: 'interest', color: 'chart-rest' },
      { value: 84_000, label: 'principal', color: 'brand' },
    ],
    label: undefined,
  },
  render: (args) => (
    <div className="flex flex-col gap-space-12">
      <ProgressBar {...args} />
      <ProgressBar.Legend
        items={[
          { label: 'interest', color: 'chart-rest' },
          { label: 'principal', color: 'brand' },
        ]}
      />
    </div>
  ),
};

export const SplitWithThreeSeries: Story = {
  name: 'Split with three series',
  args: {
    segments: [
      { value: 42_500, label: 'Groceries', color: 'chart-1' },
      { value: 28_000, label: 'Dining', color: 'chart-2' },
      { value: 15_200, label: 'Fuel', color: 'chart-3' },
    ],
    label: undefined,
  },
  render: (args) => (
    <div className="flex flex-col gap-space-12">
      <ProgressBar {...args} />
      <ProgressBar.Legend
        items={[
          { label: 'Groceries', color: 'chart-1' },
          { label: 'Dining', color: 'chart-2' },
          { label: 'Fuel', color: 'chart-3' },
        ]}
      />
    </div>
  ),
};

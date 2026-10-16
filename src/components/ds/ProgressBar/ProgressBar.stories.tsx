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
    label: { control: 'text' },
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

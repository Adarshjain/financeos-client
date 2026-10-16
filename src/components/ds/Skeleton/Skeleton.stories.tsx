import type { Meta, StoryObj } from '@storybook/react';

import { Skeleton } from '@/components/ds';

const meta: Meta<typeof Skeleton> = {
  title: 'DS/Feedback/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Loading placeholders shaped like the content they stand for: grey bars in line-soft at the heights of the text they replace.',
      },
    },
  },
  args: {
    width: Number(200),
    height: Number(12),
    circle: false,
  },
  argTypes: {
    width: { control: 'text' },
    height: { control: 'text' },
    circle: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Bar: Story = {
  args: {
    width: Number(200),
    height: Number(12),
  },
};

export const Circle: Story = {
  args: {
    circle: true,
    width: Number(32),
    height: Number(32),
  },
};

export const Figure: Story = {
  args: {
    width: Number(140),
    height: Number(24),
  },
};

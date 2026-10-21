import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { Badge } from '@/components/ds';

const meta: Meta<typeof Badge> = {
  title: 'DS/Data display/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A small coloured label for a state that applies to a whole item (a bill, a job, a statement), transaction categories, and count bubbles.',
      },
    },
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'danger', 'info'],
    },
    variant: {
      control: 'select',
      options: ['soft', 'solid', 'outline', 'dashed'],
    },
    shape: {
      control: 'select',
      options: ['default', 'rounded'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
    children: {
      control: 'text',
    },
    asChild: {
      control: false,
    },
  },
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Soft: Story = {
  args: {
    children: 'Paid',
    tone: 'success',
    variant: 'soft',
    shape: 'default',
    size: 'md',
  },
};

export const Solid: Story = {
  args: {
    children: 'Important',
    tone: 'neutral',
    variant: 'solid',
    shape: 'default',
    size: 'md',
  },
};

export const Outline: Story = {
  args: {
    children: 'Groceries',
    tone: 'neutral',
    variant: 'outline',
    shape: 'rounded',
    size: 'md',
  },
};

export const Dashed: Story = {
  args: {
    children: 'Set category',
    tone: 'warning',
    variant: 'dashed',
    shape: 'rounded',
    size: 'md',
  },
};

export const Count: Story = {
  args: {
    children: '25',
    tone: 'warning',
    variant: 'solid',
    shape: 'rounded',
    size: 'sm',
  },
};

export const Dot: Story = {
  args: {
    variant: 'dot',
    tone: 'danger',
  },
};

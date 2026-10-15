import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Logo } from './Logo';

const meta: Meta<typeof Logo> = {
  title: 'DS/Foundations/Logo',
  component: Logo,
  argTypes: {
    variant: {
      control: 'select',
      options: ['mark', 'full'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
    symbol: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const AllVariants: Story = {
  render: () => (
    <div className="p-space-16 bg-canvas min-h-full flex flex-col gap-space-12 font-text">
      <div className="flex gap-space-20 items-center">
        <Logo variant="mark" size="sm" />
        <Logo variant="mark" size="md" />
        <Logo variant="full" size="md" />
      </div>
    </div>
  ),
};

export const MarkSm: Story = {
  args: {
    variant: 'mark',
    size: 'sm',
  },
};

export const MarkMd: Story = {
  args: {
    variant: 'mark',
    size: 'md',
  },
};

export const Full: Story = {
  args: {
    variant: 'full',
    size: 'md',
  },
};

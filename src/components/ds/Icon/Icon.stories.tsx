import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Icon } from './Icon';
import { iconRegistry } from './registry';

const meta: Meta<typeof Icon> = {
  title: 'DS/Foundations/Icon',
  component: Icon,
  argTypes: {
    name: {
      control: 'select',
      options: Object.keys(iconRegistry),
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const AllVariants: Story = {
  render: () => (
    <div className="p-space-16 bg-canvas min-h-full flex flex-col gap-space-12">
      <div className="flex gap-space-16 items-center text-ink-2">
        <Icon name="chevron-down" size="sm" />
        <Icon name="close" size="sm" />
        <Icon name="check" size="sm" />
        <Icon name="search" size="sm" />
        <Icon name="chevron-down" size="md" />
        <Icon name="close" size="md" />
        <Icon name="check" size="md" />
        <Icon name="search" size="md" />
        <Icon name="chevron-down" size="lg" />
        <Icon name="close" size="lg" />
        <Icon name="check" size="lg" />
        <Icon name="search" size="lg" />
      </div>
    </div>
  ),
};

export const Sm: Story = {
  args: {
    name: 'chevron-down',
    size: 'sm',
  },
};

export const Md: Story = {
  args: {
    name: 'chevron-down',
    size: 'md',
  },
};

export const Lg: Story = {
  args: {
    name: 'chevron-down',
    size: 'lg',
  },
};

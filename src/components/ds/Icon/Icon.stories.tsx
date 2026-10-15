import type { Meta, StoryObj } from '@storybook/react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import React from 'react';

import { Icon } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'DS/Foundations/Icon',
  component: Icon,
  argTypes: {
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
        <Icon icon={ChevronDown} size="sm" />
        <Icon icon={X} size="sm" />
        <Icon icon={Check} size="sm" />
        <Icon icon={Search} size="sm" />
        <Icon icon={ChevronDown} size="md" />
        <Icon icon={X} size="md" />
        <Icon icon={Check} size="md" />
        <Icon icon={Search} size="md" />
        <Icon icon={ChevronDown} size="lg" />
        <Icon icon={X} size="lg" />
        <Icon icon={Check} size="lg" />
        <Icon icon={Search} size="lg" />
      </div>
    </div>
  ),
};

export const Sm: Story = {
  args: {
    icon: ChevronDown,
    size: 'sm',
  },
};

export const Md: Story = {
  args: {
    icon: ChevronDown,
    size: 'md',
  },
};

export const Lg: Story = {
  args: {
    icon: ChevronDown,
    size: 'lg',
  },
};

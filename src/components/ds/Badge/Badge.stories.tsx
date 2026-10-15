import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'DS/Data display/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'count'],
    },
    tone: {
      control: 'select',
      options: ['grey', 'green', 'amber', 'rose', 'blue', 'ink', 'danger', 'warning'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const AllVariants: Story = {
  render: () => (
    <div className="p-space-16 bg-canvas min-h-full flex flex-col gap-space-12 font-text">
      <div className="flex gap-space-8 flex-wrap items-center">
        <Badge tone="green">Paid</Badge>
        <Badge tone="amber">2 days</Badge>
        <Badge tone="rose">Missing</Badge>
        <Badge tone="blue">Gmail</Badge>
        <Badge tone="grey">Closed</Badge>
      </div>
      <div className="flex gap-space-8 items-center">
        <Badge variant="count" count={3} tone="ink" />
        <Badge variant="count" count={9} tone="danger" />
        <Badge variant="count" count={25} tone="warning" />
        <Badge variant="count" count={120} tone="ink" />
      </div>
    </div>
  ),
};

export const Green: Story = {
  args: {
    tone: 'green',
    children: 'Paid',
  },
};

export const Amber: Story = {
  args: {
    tone: 'amber',
    children: '2 days',
  },
};

export const Rose: Story = {
  args: {
    tone: 'rose',
    children: 'Missing',
  },
};

export const Blue: Story = {
  args: {
    tone: 'blue',
    children: 'Gmail',
  },
};

export const Grey: Story = {
  args: {
    tone: 'grey',
    children: 'Closed',
  },
};

export const Count: Story = {
  args: {
    variant: 'count',
    count: 3,
    tone: 'ink',
  },
};

export const CountDanger: Story = {
  args: {
    variant: 'count',
    count: 9,
    tone: 'danger',
  },
};

export const CountWarning: Story = {
  args: {
    variant: 'count',
    count: 25,
    tone: 'warning',
  },
};

export const CountOver99: Story = {
  args: {
    variant: 'count',
    count: 120,
    tone: 'ink',
  },
};

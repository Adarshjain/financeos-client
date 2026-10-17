import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Badge, KpiTile } from '@/components/ds';

const meta: Meta<typeof KpiTile> = {
  title: 'DS/Data display/KpiTile',
  component: KpiTile,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'hero'],
    },
    label: {
      control: 'text',
    },
    value: {
      control: 'text',
    },
    context: {
      control: 'text',
    },
    delta: {
      control: 'object',
    },
    progressBar: {
      control: 'object',
    },
    badges: {
      control: false,
    },
    loading: {
      control: 'boolean',
    },
    error: {
      control: 'text',
    },
    action: {
      control: 'object',
    },
  },
};

export default meta;
type Story = StoryObj<typeof KpiTile>;

export const Hero: Story = {
  args: {
    label: 'Net worth',
    value: '₹11,98,842',
    variant: 'hero',
    delta: {
      value: '▲ ₹41,220',
      period: 'this month',
      direction: 'good',
    },
  },
};

export const DeltaBadDirection: Story = {
  name: 'Delta bad direction',
  args: {
    label: 'Spent · October',
    value: '₹97,044',
    delta: {
      value: '▲ 28%',
      period: 'vs Sep',
      direction: 'bad',
    },
  },
};

export const WithBar: Story = {
  name: 'With bar',
  args: {
    label: 'Budget',
    value: '62%',
    progressBar: {
      value: 62,
      tone: 'warning',
    },
    context: 'of ₹1.55L · 18 days left',
  },
};

export const WithBadges: Story = {
  name: 'With badges',
  args: {
    label: 'To pay · 14 days',
    value: '₹78,219',
    badges: (
      <>
        <Badge tone="warning">Amex in 2 d</Badge>
        <Badge tone="neutral">Regalia 25 Oct</Badge>
      </>
    ),
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Failed: Story = {
  args: {
    label: 'Portfolio',
    error: 'Prices unavailable',
    action: {
      label: 'Retry',
      onSelect: fn(),
    },
  },
};

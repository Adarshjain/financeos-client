import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Badge } from '../Badge/Badge';
import { KpiTile } from './KpiTile';

const meta: Meta<typeof KpiTile> = {
  title: 'DS/Data display/KpiTile',
  component: KpiTile,
  parameters: {
    layout: 'padded',
  },
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
    loading: {
      control: 'boolean',
    },
    error: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof KpiTile>;

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-space-12 max-w-xl">
      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Hero
        </div>
        <KpiTile
          label="Net worth"
          value="₹11,98,842"
          variant="hero"
          delta={{
            value: '▲ ₹41,220',
            period: 'this month',
            direction: 'good',
          }}
        />
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Delta · bad direction
        </div>
        <KpiTile
          label="Spent · October"
          value="₹97,044"
          delta={{
            value: '▲ 28%',
            period: 'vs Sep',
            direction: 'bad',
          }}
        />
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          With a bar
        </div>
        <KpiTile
          label="Budget"
          value="62%"
          progressBar={{
            value: 62,
            tone: 'warning',
          }}
          context="of ₹1.55L · 18 days left"
        />
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          With badges
        </div>
        <KpiTile
          label="To pay · 14 days"
          value="₹78,219"
          badges={
            <>
              <Badge tone="warning">Amex in 2 d</Badge>
              <Badge tone="neutral">Regalia 25 Oct</Badge>
            </>
          }
        />
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Loading
        </div>
        <KpiTile loading />
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Failed
        </div>
        <KpiTile
          label="Portfolio"
          error={true}
          onRetry={() => {}}
        />
      </div>
    </div>
  ),
};

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
    error: true,
    onRetry: () => alert('Retrying prices service...'),
  },
};

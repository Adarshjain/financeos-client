import type { Meta, StoryObj } from '@storybook/react';

import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'DS/Data display/Badge',
  component: Badge,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

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

export const StatementVerdicts: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-space-8">
      <Badge tone="green">Auto ingested</Badge>
      <Badge tone="amber">Needs review</Badge>
      <Badge tone="rose">Rejected</Badge>
    </div>
  ),
};

export const DueStates: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-space-8">
      <Badge tone="amber">Due soon</Badge>
      <Badge tone="rose">Overdue</Badge>
      <Badge tone="amber">Part paid</Badge>
      <Badge tone="green">Paid</Badge>
    </div>
  ),
};

export const AccountStates: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-space-8">
      <Badge tone="grey">Excluded</Badge>
      <Badge tone="grey">Closing 31 Oct</Badge>
      <Badge tone="amber">No active card</Badge>
      <Badge tone="green">Gmail synced</Badge>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-2xl font-text">
      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Tones</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Badge tone="green">Paid</Badge>
          <Badge tone="amber">2 days</Badge>
          <Badge tone="rose">Missing</Badge>
          <Badge tone="blue">Gmail</Badge>
          <Badge tone="grey">Closed</Badge>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Statement verdicts</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Badge tone="green">Auto ingested</Badge>
          <Badge tone="amber">Needs review</Badge>
          <Badge tone="rose">Rejected</Badge>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Due states</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Badge tone="amber">Due soon</Badge>
          <Badge tone="rose">Overdue</Badge>
          <Badge tone="amber">Part paid</Badge>
          <Badge tone="green">Paid</Badge>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Account states</h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <Badge tone="grey">Excluded</Badge>
          <Badge tone="grey">Closing 31 Oct</Badge>
          <Badge tone="amber">No active card</Badge>
          <Badge tone="green">Gmail synced</Badge>
        </div>
      </div>
    </div>
  ),
};

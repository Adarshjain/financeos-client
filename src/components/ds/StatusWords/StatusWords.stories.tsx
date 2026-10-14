import type { Meta, StoryObj } from '@storybook/react';

import { StatusWord, StatusWords } from './StatusWords';

const meta: Meta<typeof StatusWords> = {
  title: 'DS/Data display/StatusWords',
  component: StatusWords,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof StatusWords>;

export const NeedsReview: Story = {
  render: () => (
    <div className="flex flex-col gap-space-8">
      <StatusWord tone="amber">Unreconciled</StatusWord>
      <StatusWord tone="amber">Category unverified</StatusWord>
      <StatusWord tone="amber">Duplicate</StatusWord>
      <StatusWord tone="amber">Date corrected</StatusWord>
      <StatusWord tone="amber">Watching</StatusWord>
      <StatusWord tone="amber">Unverified</StatusWord>
    </div>
  ),
};

export const Linked: Story = {
  render: () => (
    <div className="flex flex-col gap-space-8">
      <StatusWord tone="blue">Refund</StatusWord>
      <StatusWord tone="blue">Transfer</StatusWord>
      <StatusWord tone="blue">Split</StatusWord>
    </div>
  ),
};

export const Provenance: Story = {
  render: () => (
    <div className="flex flex-col gap-space-8">
      <StatusWord tone="grey">Gmail</StatusWord>
      <StatusWord tone="grey">Statement</StatusWord>
      <StatusWord tone="grey">Manual</StatusWord>
      <StatusWord tone="grey">LLM-generated</StatusWord>
      <StatusWord tone="grey">Created by you</StatusWord>
      <StatusWord tone="grey">Excluded</StatusWord>
    </div>
  ),
};

export const Verified: Story = {
  render: () => <StatusWord tone="green">Verified</StatusWord>,
};

export const ContextLine: Story = {
  args: {
    prefix: 'HDFC Regalia ••7741',
    items: [
      { tone: 'amber', label: 'Unreconciled' },
      { tone: 'blue', label: 'Refund' },
      { tone: 'grey', label: 'Gmail' },
    ],
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-lg font-text">
      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          Status vocabulary
        </h3>
        <div className="flex flex-wrap items-center gap-space-12 p-space-12 rounded-ds-lg border border-line bg-surface">
          <StatusWord tone="amber">Unreconciled</StatusWord>
          <StatusWord tone="blue">Refund</StatusWord>
          <StatusWord tone="grey">Gmail</StatusWord>
          <StatusWord tone="green">Verified</StatusWord>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          On card context lines
        </h3>
        <div className="flex flex-col gap-space-8 p-space-14 rounded-ds-lg border border-line bg-surface">
          <StatusWords
            prefix="HDFC Regalia ••7741"
            items={[
              { tone: 'amber', label: 'Unreconciled' },
              { tone: 'blue', label: 'Refund' },
              { tone: 'grey', label: 'Gmail' },
            ]}
          />
          <StatusWords
            items={[
              { tone: 'amber', label: 'Unverified' },
              { tone: 'grey', label: 'LLM-generated · MCC 5814' },
            ]}
          />
          <StatusWords
            items={[
              { tone: 'green', label: 'Verified' },
              { tone: 'grey', label: 'Created by you' },
            ]}
          />
        </div>
      </div>
    </div>
  ),
};

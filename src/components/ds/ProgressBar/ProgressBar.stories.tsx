import type { Meta, StoryObj } from '@storybook/react';

import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'DS/Data display/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Brand: Story = {
  args: {
    value: 21,
    label: '21% · 152 days left',
  },
};

export const Warning: Story = {
  args: {
    value: 62,
    label: '62% of budget · ₹93,000 spent',
  },
};

export const OverTheLimit: Story = {
  args: {
    value: 108,
    label: '108% · over by ₹12,400',
  },
};

export const Empty: Story = {
  args: {
    value: 0,
    label: '0% of ₹2,00,000 used',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-md font-text">
      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Brand (&lt;60%)</h3>
        <ProgressBar value={21} label="21% · 152 days left" />
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Warning (60%–100%)</h3>
        <ProgressBar value={62} label="62% of ₹1,55,000 budget · 18 days left" />
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Over the limit (&gt;100%)</h3>
        <ProgressBar value={108} label="108% · over by ₹12,400" />
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">Empty</h3>
        <ProgressBar value={0} label="0% of ₹2,00,000 used" />
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';

import { CategoryChip } from './CategoryChip';

const meta: Meta<typeof CategoryChip> = {
  title: 'DS/Data display/CategoryChip',
  component: CategoryChip,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof CategoryChip>;

export const Default: Story = {
  args: {
    children: 'Food & dining',
  },
};

export const Count: Story = {
  args: {
    count: 2,
  },
};

export const Unset: Story = {
  args: {
    variant: 'unset',
  },
};

export const Interactive: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-space-8">
      <CategoryChip onClick={() => alert('Clicked category')}>
        Groceries
      </CategoryChip>
      <CategoryChip count={3} onClick={() => alert('Clicked +3')} />
      <CategoryChip variant="unset" onClick={() => alert('Open category picker')} />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-2xl font-text">
      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          Category chips
        </h3>
        <div className="flex flex-wrap items-center gap-space-8">
          <CategoryChip>Food &amp; dining</CategoryChip>
          <CategoryChip>Groceries</CategoryChip>
          <CategoryChip count={2} />
          <CategoryChip variant="unset" />
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          In transaction row context
        </h3>
        <div className="flex items-center gap-space-8 p-space-12 rounded-ds-lg border border-line bg-surface">
          <span className="text-body-strong text-ink">Swiggy Bangalore</span>
          <span className="text-caption text-ink-3">HDFC Regalia</span>
          <div className="ml-auto flex items-center gap-space-6">
            <CategoryChip>Food &amp; dining</CategoryChip>
            <CategoryChip count={1} />
            <span className="text-body-strong text-ink">₹1,249.00</span>
          </div>
        </div>
      </div>
    </div>
  ),
};

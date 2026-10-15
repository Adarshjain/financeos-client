import type { Meta, StoryObj } from '@storybook/react';

import { AppBar } from './AppBar';

const meta: Meta<typeof AppBar> = {
  title: 'DS/Navigation/AppBar',
  component: AppBar,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    title: { control: 'text' },
    crumb: { control: 'text' },
    back: { control: 'boolean' },
    showActions: { control: 'boolean' },
    addAriaLabel: { control: 'text' },
    backAriaLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof AppBar>;

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-sm font-text">
      <div>
        <div className="text-caption font-bold text-ink-4 uppercase tracking-wider mb-space-8">
          Top level
        </div>
        <AppBar crumb="Money" title="Transactions" />
      </div>

      <div>
        <div className="text-caption font-bold text-ink-4 uppercase tracking-wider mb-space-8">
          Detail screen
        </div>
        <AppBar back crumb="Accounts" title="HDFC Regalia Gold" />
      </div>

      <div>
        <div className="text-caption font-bold text-ink-4 uppercase tracking-wider mb-space-8">
          Without crumb
        </div>
        <AppBar title="Overview" />
      </div>
    </div>
  ),
};

export const TopLevel: Story = {
  args: {
    crumb: 'Money',
    title: 'Transactions',
  },
};

export const DetailScreen: Story = {
  args: {
    back: true,
    crumb: 'Accounts',
    title: 'HDFC Regalia Gold',
  },
};

export const WithoutCrumb: Story = {
  args: {
    title: 'Overview',
  },
};

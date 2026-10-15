import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { TabBar, TabBarTabId } from './TabBar';

const meta: Meta<typeof TabBar> = {
  title: 'DS/Navigation/TabBar',
  component: TabBar,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    activeTab: {
      control: 'select',
      options: ['home', 'inbox', 'upcoming', 'transactions', 'more'],
      description: 'The active tab ID',
    },
    inboxCount: {
      control: 'number',
      description: 'Count badge for Inbox (danger tone)',
    },
    transactionsCount: {
      control: 'number',
      description: 'Count badge for Transactions (warning tone)',
    },
    hidden: {
      control: 'boolean',
      description: 'Whether the tab bar is hidden (e.g. during selection mode)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TabBar>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-md">
      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Home Active (with counts)
        </h4>
        <div className="bg-canvas p-space-16 rounded-ds-lg">
          <TabBar activeTab="home" inboxCount={4} transactionsCount={25} />
        </div>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Transactions Active
        </h4>
        <div className="bg-canvas p-space-16 rounded-ds-lg">
          <TabBar
            activeTab="transactions"
            inboxCount={4}
            transactionsCount={25}
          />
        </div>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          High Counts (99+)
        </h4>
        <div className="bg-canvas p-space-16 rounded-ds-lg">
          <TabBar activeTab="inbox" inboxCount={150} transactionsCount={200} />
        </div>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Upcoming (no counts)
        </h4>
        <div className="bg-canvas p-space-16 rounded-ds-lg">
          <TabBar activeTab="upcoming" />
        </div>
      </div>
    </div>
  ),
};

export const HomeActive: Story = {
  name: 'HomeActive',
  args: {
    activeTab: 'home',
    inboxCount: 4,
    transactionsCount: 25,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
        <Story />
      </div>
    ),
  ],
};

export const TransactionsActive: Story = {
  name: 'TransactionsActive',
  args: {
    activeTab: 'transactions',
    inboxCount: 4,
    transactionsCount: 25,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
        <Story />
      </div>
    ),
  ],
};

export const HighCounts: Story = {
  name: 'HighCounts',
  args: {
    activeTab: 'inbox',
    inboxCount: 120,
    transactionsCount: 104,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
        <Story />
      </div>
    ),
  ],
};

export const NoCounts: Story = {
  name: 'NoCounts',
  args: {
    activeTab: 'upcoming',
  },
  decorators: [
    (Story) => (
      <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
        <Story />
      </div>
    ),
  ],
};

const InteractiveTabBar = (args: React.ComponentProps<typeof TabBar>) => {
  const [active, setActive] = useState<TabBarTabId>(args.activeTab || 'home');

  return (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
      <TabBar
        {...args}
        activeTab={active}
        onTabChange={setActive}
      />
    </div>
  );
};

export const Interactive: Story = {
  name: 'Interactive',
  args: {
    activeTab: 'home',
    inboxCount: 9,
    transactionsCount: 25,
  },
  render: (args) => <InteractiveTabBar {...args} />,
};

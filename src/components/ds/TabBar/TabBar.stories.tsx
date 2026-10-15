import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { TabBar, TabBarTabId } from './TabBar';

const meta: Meta<typeof TabBar> = {
  title: 'DS/Navigation/TabBar',
  component: TabBar,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof TabBar>;

export const HomeActive: Story = {
  name: 'HomeActive',
  render: () => (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
      <TabBar activeTab="home" inboxCount={4} transactionsCount={25} />
    </div>
  ),
};

export const TransactionsActive: Story = {
  name: 'TransactionsActive',
  render: () => (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
      <TabBar activeTab="transactions" inboxCount={4} transactionsCount={25} />
    </div>
  ),
};

export const HighCounts: Story = {
  name: 'HighCounts',
  render: () => (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
      <TabBar activeTab="inbox" inboxCount={120} transactionsCount={104} />
    </div>
  ),
};

export const NoCounts: Story = {
  name: 'NoCounts',
  render: () => (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
      <TabBar activeTab="upcoming" />
    </div>
  ),
};

const InteractiveTabBar: React.FC = () => {
  const [active, setActive] = useState<TabBarTabId>('home');

  return (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
      <TabBar
        activeTab={active}
        onTabChange={setActive}
        inboxCount={9}
        transactionsCount={25}
      />
    </div>
  );
};

export const Interactive: Story = {
  name: 'Interactive',
  render: () => <InteractiveTabBar />,
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-md">
      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Home Active (with counts)
        </h4>
        <TabBar activeTab="home" inboxCount={4} transactionsCount={25} />
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Transactions Active
        </h4>
        <TabBar
          activeTab="transactions"
          inboxCount={4}
          transactionsCount={25}
        />
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          High Counts (99+)
        </h4>
        <TabBar activeTab="inbox" inboxCount={150} transactionsCount={200} />
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          No Counts
        </h4>
        <TabBar activeTab="upcoming" />
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';

import { TabBar, type TabBarItem } from './TabBar';

const financeOSItems: TabBarItem[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox', count: 4, countTone: 'danger' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar', href: '/upcoming' },
  { id: 'transactions', label: 'Transactions', icon: 'transactions', href: '/transactions', count: 25, countTone: 'warning' },
  { id: 'more', label: 'More', icon: 'more', href: '/more' },
];

const meta: Meta<typeof TabBar> = {
  title: 'DS/Navigation/TabBar',
  component: TabBar,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    current: {
      control: 'select',
      options: ['home', 'inbox', 'upcoming', 'transactions', 'more'],
      description: 'The active tab ID',
    },
    hidden: {
      control: 'boolean',
      description: 'Whether the tab bar is hidden (e.g. during selection mode)',
    },
  },
  render: function Render(args) {
    const [{ current }, updateArgs] = useArgs();
    return (
      <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
        <TabBar
          {...args}
          current={current ?? args.current}
          onSelect={(id) => updateArgs({ current: id })}
        />
      </div>
    );
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
          <TabBar items={financeOSItems} current="home" />
        </div>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Transactions Active
        </h4>
        <div className="bg-canvas p-space-16 rounded-ds-lg">
          <TabBar items={financeOSItems} current="transactions" />
        </div>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          High Counts (99+)
        </h4>
        <div className="bg-canvas p-space-16 rounded-ds-lg">
          <TabBar
            items={financeOSItems.map((item) =>
              item.id === 'inbox'
                ? { ...item, count: 150 }
                : item.id === 'transactions'
                  ? { ...item, count: 200 }
                  : item,
            )}
            current="inbox"
          />
        </div>
      </div>

      <div>
        <h4 className="font-text text-label font-bold text-ink-3 mb-space-8">
          Upcoming (no counts)
        </h4>
        <div className="bg-canvas p-space-16 rounded-ds-lg">
          <TabBar
            items={financeOSItems.map(({ count: _c, countTone: _t, ...rest }) => rest)}
            current="upcoming"
          />
        </div>
      </div>
    </div>
  ),
};

export const HomeActive: Story = {
  name: 'HomeActive',
  args: {
    items: financeOSItems,
    current: 'home',
  },
};

export const TransactionsActive: Story = {
  name: 'TransactionsActive',
  args: {
    items: financeOSItems,
    current: 'transactions',
  },
};

export const HighCounts: Story = {
  name: 'HighCounts',
  args: {
    items: financeOSItems.map((item) =>
      item.id === 'inbox'
        ? { ...item, count: 120 }
        : item.id === 'transactions'
          ? { ...item, count: 104 }
          : item,
    ),
    current: 'inbox',
  },
};

export const NoCounts: Story = {
  name: 'NoCounts',
  args: {
    items: financeOSItems.map(({ count: _c, countTone: _t, ...rest }) => rest),
    current: 'upcoming',
  },
};

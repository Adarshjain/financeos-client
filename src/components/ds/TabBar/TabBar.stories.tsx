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

function Scene({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-space-8">
      {title && (
        <div className="font-text text-overline uppercase text-ink-4 mt-space-4">
          {title}
        </div>
      )}
      <div className="relative h-48 border border-line rounded-ds-lg overflow-hidden bg-canvas p-space-12 pb-tab-bar-clearance">
        <div className="bg-surface border border-line rounded-ds-lg h-control-xl mb-space-8" />
        <div className="bg-surface border border-line rounded-ds-lg h-control-xl mb-space-8" />
        <div className="bg-surface border border-line rounded-ds-lg h-control-xl" />
        {children}
      </div>
    </div>
  );
}

const meta: Meta<typeof TabBar> = {
  title: 'DS/Navigation/TabBar',
  component: TabBar,
  parameters: {
    layout: 'padded',
    viewport: { defaultViewport: 'phone' },
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
      <div className="flex flex-col gap-space-12">
        <p className="font-text text-caption text-ink-3">
          Pages keep <code className="font-text font-bold text-ink">pb-tab-bar-clearance</code> under the bar.
        </p>
        <Scene>
          <TabBar
            {...args}
            className="absolute inset-x-space-12 bottom-space-12"
            current={current ?? args.current}
            onSelect={(id) => updateArgs({ current: id })}
          />
        </Scene>
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof TabBar>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-16">
      <p className="font-text text-caption text-ink-3">
        Pages keep <code className="font-text font-bold text-ink">pb-tab-bar-clearance</code> under the bar.
      </p>

      <Scene title="Home current">
        <TabBar
          items={financeOSItems}
          current="home"
          className="absolute inset-x-space-12 bottom-space-12"
        />
      </Scene>

      <Scene title="Transactions current">
        <TabBar
          items={financeOSItems}
          current="transactions"
          className="absolute inset-x-space-12 bottom-space-12"
        />
      </Scene>

      <Scene title="Count over 99">
        <TabBar
          items={financeOSItems.map((item) =>
            item.id === 'inbox'
              ? { ...item, count: 120 }
              : item.id === 'transactions'
                ? { ...item, count: 104 }
                : item,
          )}
          current="inbox"
          className="absolute inset-x-space-12 bottom-space-12"
        />
      </Scene>
    </div>
  ),
};

export const HomeCurrent: Story = {
  name: 'Home current',
  args: {
    items: financeOSItems,
    current: 'home',
  },
};

export const TransactionsCurrent: Story = {
  name: 'Transactions current',
  args: {
    items: financeOSItems,
    current: 'transactions',
  },
};

export const CountOver99: Story = {
  name: 'Count over 99',
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

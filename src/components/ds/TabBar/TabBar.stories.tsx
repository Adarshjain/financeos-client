import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { TabBar, type TabBarItem } from '@/components/ds';

const financeOSItems: TabBarItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', count: 4, countTone: 'danger' },
  { id: 'upcoming', label: 'Upcoming', icon: 'calendar' },
  { id: 'transactions', label: 'Transactions', icon: 'list-bullets', count: 25, countTone: 'warning' },
  { id: 'more', label: 'More', icon: 'more' },
];

const meta: Meta<typeof TabBar> = {
  title: 'DS/Navigation/TabBar',
  component: TabBar,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'phone' },
    docs: {
      description: {
        component: 'Pages keep clearance at the bottom under the bar.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-80 relative transform-gpu">
        <Story />
      </div>
    ),
  ],
  args: {
    items: financeOSItems,
    current: 'home',
    onSelect: fn(),
  },
  argTypes: {
    current: {
      control: 'select',
      options: ['home', 'inbox', 'upcoming', 'transactions', 'more'],
      description: 'The active tab ID',
    },
    items: {
      control: 'object',
    },
  },
  render: function Render(args) {
    const [{ current }, updateArgs] = useArgs();
    return (
      <TabBar
        {...args}
        current={current ?? args.current}
        onSelect={(id) => {
          args.onSelect?.(id);
          updateArgs({ current: id });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof TabBar>;

export const Default: Story = {
  name: 'Default',
  args: {
    items: financeOSItems,
    current: 'home',
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

export const AsChildLink: Story = {
  name: 'With Next.js link (asChild)',
  args: {
    items: [
      {
        id: 'home',
        label: 'Home',
        icon: 'home',
        asChild: true,
        children: <a href="/dashboard" />,
      },
      {
        id: 'inbox',
        label: 'Inbox',
        icon: 'inbox',
        count: 4,
        countTone: 'danger',
        asChild: true,
        children: <a href="/inbox" />,
      },
      {
        id: 'more',
        label: 'More',
        icon: 'more',
      },
    ],
    current: 'home',
  },
};

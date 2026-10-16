import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';

import { Rail, type RailGroup, type RailItem, type RailUser } from './Rail';

const financeOSRailGroups: RailGroup[] = [
  {
    items: [
      { id: 'home', label: 'Home', icon: 'home', href: '/' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '/inbox', count: 9, countTone: 'danger' },
      { id: 'upcoming', label: 'Upcoming', icon: 'calendar', href: '/upcoming' },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'accounts', label: 'Accounts', icon: 'wallet', href: '/accounts' },
      { id: 'transactions', label: 'Transactions', icon: 'list-bullets', href: '/transactions', count: 25, countTone: 'warning' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'ask-data', label: 'Ask the data', icon: 'chat', href: '/chat' },
    ],
  },
];

const financeOSFooterItems: RailItem[] = [
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
];

const financeOSUser: RailUser = {
  name: 'Arjun Mehta',
  initials: 'AM',
};

const meta: Meta<typeof Rail> = {
  title: 'DS/Navigation/Rail',
  component: Rail,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    current: {
      control: 'select',
      options: ['/', '/inbox', '/upcoming', '/accounts', '/transactions', '/chat', '/settings'],
    },
  },
  render: function Render(args) {
    const [{ current }, updateArgs] = useArgs();
    return (
      <div className="h-screen flex">
        <Rail
          {...args}
          current={current ?? args.current}
          onSelect={(id) => updateArgs({ current: id })}
          onNavigate={(href) => updateArgs({ current: href })}
        />
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof Rail>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-space-24 h-screen font-text">
      <Rail
        current="/"
        groups={financeOSRailGroups}
        footer={financeOSFooterItems}
        user={financeOSUser}
        search={() => {}}
      />
      <Rail
        current="/transactions"
        groups={financeOSRailGroups}
        footer={financeOSFooterItems}
        user={financeOSUser}
        search={() => {}}
      />
    </div>
  ),
};

export const Default: Story = {
  args: {
    current: '/',
    groups: financeOSRailGroups,
    footer: financeOSFooterItems,
    user: financeOSUser,
    search: { shortcut: '⌘K' },
  },
};

export const WithCounts: Story = {
  args: {
    current: '/inbox',
    groups: financeOSRailGroups,
    footer: financeOSFooterItems,
    user: financeOSUser,
    search: { shortcut: '⌘K' },
  },
};

export const TransactionsActive: Story = {
  args: {
    current: '/transactions',
    groups: financeOSRailGroups,
    footer: financeOSFooterItems,
    user: financeOSUser,
    search: { shortcut: '⌘K' },
  },
};

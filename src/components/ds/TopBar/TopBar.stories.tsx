import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Button, Card, ListRow, TopBar, type TopBarAction } from '@/components/ds';

const defaultActions: TopBarAction[] = [
  { id: 'search', icon: 'search', label: 'Search', onSelect: fn() },
  { id: 'chat', icon: 'chat', label: 'Ask data', onSelect: fn() },
  { id: 'notifications', icon: 'notifications', label: 'Notifications', onSelect: fn() },
];

const actionsWithPrimary: TopBarAction[] = [
  { id: 'search', icon: 'search', label: 'Search', onSelect: fn() },
  { id: 'chat', icon: 'chat', label: 'Chat', onSelect: fn() },
  { id: 'add', icon: 'add', label: 'Add', variant: 'primary', shortcut: '⌘N', onSelect: fn() },
];

const meta: Meta<typeof TopBar> = {
  title: 'DS/Navigation/TopBar',
  component: TopBar,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Card className="max-w-3xl overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  args: {
    title: 'Home',
    actions: defaultActions,
  },
  argTypes: {
    title: { control: 'text' },
    crumb: { control: 'text' },
    leading: { control: false },
    actions: { control: 'object' },
    backHref: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof TopBar>;

export const TopLevel: Story = {
  args: {
    title: 'Home',
    actions: defaultActions,
  },
};

export const Detail: Story = {
  args: {
    crumb: 'Accounts',
    title: 'HDFC Regalia Gold',
    onBack: fn(),
    actions: defaultActions,
  },
};

export const WithPrimaryAction: Story = {
  args: {
    crumb: 'Money',
    title: 'Transactions',
    actions: actionsWithPrimary,
  },
};

export const PhoneOnlyAction: Story = {
  args: {
    title: 'Home',
    actions: [
      { id: 'search', icon: 'search', label: 'Search', phoneOnly: true, onSelect: fn() },
      ...defaultActions.filter((a) => a.id !== 'search'),
    ],
  },
};

export const WithNotifications: Story = {
  args: {
    title: 'Home',
    actions: [
      { id: 'search', icon: 'search', label: 'Search', onSelect: fn() },
      {
        id: 'notifications',
        icon: 'notifications',
        label: 'Notifications',
        dot: true,
        popover: {
          onOpenChange: fn(),
          content: (
            <div className="w-72">
              <ListRow title="HDFC Regalia bill due" subtitle="₹12,450 due in 3 days" />
              <ListRow title="Statement parsed" subtitle="Axis Magnus, September" />
              <ListRow title="2 rules need approval" subtitle="Suggested from recent transactions" />
              <div className="p-space-8">
                <Button variant="link">View all notifications</Button>
              </div>
            </div>
          ),
        },
      },
    ],
  },
};

export const WithMenu: Story = {
  args: {
    title: 'Investments',
    actions: [
      { id: 'search', icon: 'search', label: 'Search', onSelect: fn() },
      {
        id: 'add',
        icon: 'add',
        label: 'Add',
        variant: 'primary',
        showLabel: true,
        labelIconSize: 'xs',
        menu: [
          { id: 'record', label: 'Record trade', onSelect: fn() },
          { id: 'import', label: 'Import tradebook', asChild: true, children: <a href="#import" /> },
        ],
      },
    ],
  },
};

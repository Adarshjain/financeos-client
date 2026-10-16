import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Card, TopBar, type TopBarAction } from '@/components/ds';

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

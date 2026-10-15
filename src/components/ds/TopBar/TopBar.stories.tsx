import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { TopBar, type TopBarAction } from './TopBar';

const phoneActions: TopBarAction[] = [
  { id: 'ask', icon: 'chat', label: 'Ask the data' },
  { id: 'search', icon: 'search', label: 'Search' },
  { id: 'add', icon: 'add', label: 'Add', variant: 'primary' },
];

const desktopActions: TopBarAction[] = [
  { id: 'add', icon: 'add', label: 'Add', shortcut: '⌘N' },
  { id: 'chat', icon: 'chat', label: 'Chat' },
  { id: 'notifications', icon: 'notifications', label: 'Notifications' },
];

const meta: Meta<typeof TopBar> = {
  title: 'DS/Navigation/TopBar',
  component: TopBar,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    title: { control: 'text' },
    crumb: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof TopBar>;

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 w-full max-w-4xl font-text">
      <div>
        <div className="text-caption font-bold text-ink-4 uppercase tracking-wider mb-space-8">
          Phone · Top level
        </div>
        <div className="max-w-md border border-line rounded-ds-lg overflow-hidden">
          <TopBar
            crumb="Money"
            title="Transactions"
            actions={phoneActions}
          />
        </div>
      </div>

      <div>
        <div className="text-caption font-bold text-ink-4 uppercase tracking-wider mb-space-8">
          Phone · Detail screen
        </div>
        <div className="max-w-md border border-line rounded-ds-lg overflow-hidden">
          <TopBar
            back={() => {}}
            crumb="Accounts"
            title="HDFC Regalia Gold"
            actions={phoneActions}
          />
        </div>
      </div>

      <div>
        <div className="text-caption font-bold text-ink-4 uppercase tracking-wider mb-space-8">
          Desktop · Top level
        </div>
        <div className="border border-line rounded-ds-lg overflow-hidden">
          <TopBar
            title="Home"
            actions={desktopActions}
          />
        </div>
      </div>

      <div>
        <div className="text-caption font-bold text-ink-4 uppercase tracking-wider mb-space-8">
          Desktop · Detail screen
        </div>
        <div className="border border-line rounded-ds-lg overflow-hidden">
          <TopBar
            crumb="Accounts"
            title="HDFC Regalia Gold"
            actions={desktopActions}
          />
        </div>
      </div>
    </div>
  ),
};

export const PhoneTopLevel: Story = {
  name: 'Phone · top level',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  args: {
    crumb: 'Money',
    title: 'Transactions',
    actions: phoneActions,
  },
};

export const PhoneDetail: Story = {
  name: 'Phone · detail screen',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  args: {
    back: () => {},
    crumb: 'Accounts',
    title: 'HDFC Regalia Gold',
    actions: phoneActions,
  },
};

export const DesktopTopLevel: Story = {
  name: 'Desktop · top level',
  args: {
    title: 'Home',
    actions: desktopActions,
  },
};

export const DesktopDetail: Story = {
  name: 'Desktop · detail screen',
  args: {
    crumb: 'Accounts',
    title: 'HDFC Regalia Gold',
    actions: desktopActions,
  },
};

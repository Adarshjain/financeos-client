import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { AppBar, BrandMark, DesktopRail, DesktopTopBar } from './AppBar';

const meta: Meta<typeof AppBar> = {
  title: 'DS/Navigation/AppBar',
  component: AppBar,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof AppBar>;

export const TopLevel: Story = {
  name: 'Top level',
  render: () => (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
      <AppBar
        title="Transactions"
        crumb="Money"
        onAsk={() => alert('Ask the data')}
        onSearch={() => alert('Search')}
        onAdd={() => alert('Quick add')}
        addAriaLabel="Quick add transaction"
      />
    </div>
  ),
};

export const DetailScreen: Story = {
  name: 'Detail screen',
  render: () => (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
      <AppBar
        back
        title="HDFC Regalia Gold"
        crumb="Accounts"
        onBack={() => alert('Go back')}
        onAsk={() => alert('Ask')}
        onSearch={() => alert('Search')}
        onAdd={() => alert('Add statement')}
        addAriaLabel="Add statement"
      />
    </div>
  ),
};

export const WithoutCrumb: Story = {
  name: 'Without crumb',
  render: () => (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg">
      <AppBar
        title="Settings"
        onAsk={() => alert('Ask')}
        onSearch={() => alert('Search')}
        onAdd={() => alert('Add')}
      />
    </div>
  ),
};

export const DesktopTopBarStory: Story = {
  name: 'DesktopTopBar',
  render: () => (
    <div className="w-full bg-canvas p-space-16 rounded-ds-lg">
      <DesktopTopBar
        title="Transactions"
        onAdd={() => alert('Add')}
        onAsk={() => alert('Ask the data')}
        onNotifications={() => alert('Notifications')}
      />
    </div>
  ),
};

const InteractiveDesktopRail: React.FC = () => {
  const [active, setActive] = useState('/transactions');

  return (
    <div className="bg-canvas p-space-16 rounded-ds-lg inline-block">
      <DesktopRail
        activeHref={active}
        onNavigate={(href) => setActive(href)}
        onSearch={() => alert('Open search palette')}
      />
    </div>
  );
};

export const DesktopRailStory: Story = {
  name: 'DesktopRail',
  render: () => <InteractiveDesktopRail />,
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-xl">
      <div>
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
          Phone Top Level
        </h4>
        <AppBar
          title="Transactions"
          crumb="Money"
          onAsk={() => {}}
          onSearch={() => {}}
          onAdd={() => {}}
        />
      </div>

      <div>
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
          Phone Detail Screen
        </h4>
        <AppBar
          back
          title="HDFC Regalia Gold"
          crumb="Accounts"
          onBack={() => {}}
          onAsk={() => {}}
          onSearch={() => {}}
          onAdd={() => {}}
        />
      </div>

      <div>
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
          Brand Mark
        </h4>
        <div className="flex items-center gap-space-12">
          <BrandMark />
          <BrandMark symbol="$" />
          <BrandMark symbol="€" />
        </div>
      </div>

      <div>
        <h4 className="text-small font-semibold text-ink-3 mb-space-8">
          Desktop Top Bar
        </h4>
        <DesktopTopBar
          title="Settings"
          onAdd={() => {}}
          onAsk={() => {}}
          onNotifications={() => {}}
        />
      </div>
    </div>
  ),
};

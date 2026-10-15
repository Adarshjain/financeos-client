import type { Meta, StoryObj } from '@storybook/react';

import { TopBar } from './TopBar';

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
    <div className="space-y-space-24 w-full max-w-2xl font-text">
      <div>
        <div className="text-caption font-bold text-ink-4 uppercase tracking-wider mb-space-8">
          Top level
        </div>
        <TopBar
          title="Home"
          onAdd={() => {}}
          onChat={() => {}}
          onNotifications={() => {}}
        />
      </div>

      <div>
        <div className="text-caption font-bold text-ink-4 uppercase tracking-wider mb-space-8">
          Detail screen
        </div>
        <TopBar
          crumb="Accounts"
          title="HDFC Regalia Gold"
          onAdd={() => {}}
          onChat={() => {}}
          onNotifications={() => {}}
        />
      </div>
    </div>
  ),
};

export const TopLevel: Story = {
  args: {
    title: 'Home',
    onAdd: () => {},
    onChat: () => {},
    onNotifications: () => {},
  },
};

export const Detail: Story = {
  args: {
    crumb: 'Accounts',
    title: 'HDFC Regalia Gold',
    onAdd: () => {},
    onChat: () => {},
    onNotifications: () => {},
  },
};

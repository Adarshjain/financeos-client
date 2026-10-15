import type { Meta, StoryObj } from '@storybook/react';

import { defaultRailGroups, Rail } from './Rail';

const meta: Meta<typeof Rail> = {
  title: 'DS/Navigation/Rail',
  component: Rail,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    current: {
      control: 'select',
      options: ['/', '/inbox', '/upcoming', '/accounts', '/transactions', '/investments', '/rewards', '/loans', '/chat', '/settings'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Rail>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-space-24 h-screen font-text">
      <Rail
        current="/"
        user={{ name: 'Arjun Mehta', initials: 'AM' }}
        onSearch={() => {}}
      />
      <Rail
        current="/transactions"
        user={{ name: 'Arjun Mehta', initials: 'AM' }}
        onSearch={() => {}}
      />
    </div>
  ),
};

export const Default: Story = {
  args: {
    current: '/',
    user: { name: 'Arjun Mehta', initials: 'AM' },
    items: defaultRailGroups,
  },
};

export const WithCounts: Story = {
  args: {
    current: '/inbox',
    user: { name: 'Arjun Mehta', initials: 'AM' },
    items: defaultRailGroups,
  },
};

export const TransactionsActive: Story = {
  args: {
    current: '/transactions',
    user: { name: 'Arjun Mehta', initials: 'AM' },
    items: defaultRailGroups,
  },
};

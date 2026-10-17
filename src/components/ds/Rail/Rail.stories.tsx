import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import {
  Avatar,
  Button,
  Icon,
  Kbd,
  ListRow,
  Rail,
  type RailGroup,
  Text,
} from '@/components/ds';

const financeOSRailGroups: RailGroup[] = [
  {
    items: [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', count: 9, countTone: 'danger' },
      { id: 'upcoming', label: 'Upcoming', icon: 'calendar' },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'accounts', label: 'Accounts', icon: 'wallet' },
      { id: 'transactions', label: 'Transactions', icon: 'list-bullets', count: 25, countTone: 'warning' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'ask-data', label: 'Ask the data', icon: 'chat' },
    ],
  },
];

const plainRailGroups: RailGroup[] = [
  {
    items: [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox' },
      { id: 'upcoming', label: 'Upcoming', icon: 'calendar' },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'accounts', label: 'Accounts', icon: 'wallet' },
      { id: 'transactions', label: 'Transactions', icon: 'list-bullets' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'ask-data', label: 'Ask the data', icon: 'chat' },
    ],
  },
];

const sampleBrand = (
  <div className="flex items-center gap-space-8 px-space-8 py-space-4">
    <Icon name="wallet" size="md" />
    <Text variant="title">Acme</Text>
  </div>
);

const sampleSearch = (
  <Button
    type="button"
    variant="secondary"
    size="md"
    fullWidth
    icon={<Icon name="search" size="md" />}
  >
    <span>Search</span>
    <span className="ml-auto">
      <Kbd>⌘K</Kbd>
    </span>
  </Button>
);

const sampleFooter = (
  <ListRow
    asChild
    leading={
      <Avatar variant="circle" tone="brand" size="sm" initials="AM">
        AM
      </Avatar>
    }
    title="Arjun Mehta"
    subtitle="arjun.mehta@gmail.com"
    borderTop={false}
    className="px-space-8"
  >
    <a href="#" />
  </ListRow>
);

const meta: Meta<typeof Rail> = {
  title: 'DS/Navigation/Rail',
  component: Rail,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="h-screen flex">
        <Story />
      </div>
    ),
  ],
  args: {
    groups: plainRailGroups,
    value: 'home',
    brand: sampleBrand,
    search: sampleSearch,
    onValueChange: fn(),
    onSelect: fn(),
  },
  argTypes: {
    value: {
      control: 'select',
      options: ['home', 'inbox', 'upcoming', 'accounts', 'transactions', 'ask-data', 'overview', 'reports'],
    },
    groups: { control: 'object' },
    brand: { control: false },
    search: { control: false },
    footer: { control: false },
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Rail
        {...args}
        value={value ?? args.value}
        onValueChange={(val) => {
          args.onValueChange?.(val);
          updateArgs({ value: val });
        }}
        onSelect={(id) => {
          args.onSelect?.(id);
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof Rail>;

export const Default: Story = {
  args: {
    value: 'home',
    groups: plainRailGroups,
  },
};

export const WithBadges: Story = {
  args: {
    value: 'inbox',
    groups: financeOSRailGroups,
  },
};

export const WithoutHeader: Story = {
  args: {
    value: 'overview',
    groups: [
      {
        items: [
          { id: 'overview', label: 'Overview', icon: 'squares-four' },
          { id: 'reports', label: 'Reports', icon: 'chart-bar' },
        ],
      },
    ],
  },
};

export const WithFooter: Story = {
  args: {
    value: 'home',
    groups: financeOSRailGroups,
    footer: sampleFooter,
  },
};

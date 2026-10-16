import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import {
  Avatar,
  Badge,
  Card,
  DateTile,
  ListRow,
  Text,
} from '@/components/ds';

const meta = {
  title: 'DS/Data display/ListRow',
  component: ListRow,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The one row for lists, tables, pickers and cards. It supports leading avatars, date tiles, trailing status badges, chevron navigation, and actions menus.',
      },
    },
  },
  decorators: [
    (Story) => (
      <Card className="max-w-md">
        <Story />
      </Card>
    ),
  ],
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    chevron: { control: 'boolean' },
    highlighted: { control: 'boolean' },
    disabled: { control: 'boolean' },
    borderTop: { control: 'boolean' },
    clickable: { control: 'boolean' },
    asChild: { control: 'boolean' },
    leading: { control: false },
    trailing: { control: false },
    actions: { control: false },
  },
  args: {
    title: 'Rahul Sharma',
    subtitle: 'HDFC Regalia ••7741',
    chevron: false,
    highlighted: false,
    disabled: false,
    borderTop: true,
    clickable: false,
    asChild: false,
    onClick: fn(),
  },
} satisfies Meta<typeof ListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Rahul Sharma',
    subtitle: 'HDFC Regalia ••7741',
  },
};

export const WithAvatar: Story = {
  args: {
    leading: <Avatar variant="circle" initials="RS" tone="brand" />,
    title: 'Rahul Sharma',
    subtitle: 'Personal account',
    trailing: (
      <Text variant="body-strong" tone="positive">
        +₹15,000
      </Text>
    ),
  },
};

export const WithDateTile: Story = {
  args: {
    leading: <DateTile day={14} monthLabel="Oct" />,
    title: 'Amex Platinum bill',
    subtitle: 'Due in 3 days',
    trailing: <Text variant="body-strong">₹33,900</Text>,
  },
};

export const WithBadge: Story = {
  args: {
    title: 'SBI Credit Card',
    subtitle: 'Statement upload required',
    trailing: <Badge tone="danger">Missing</Badge>,
  },
};

export const WithActions: Story = {
  args: {
    title: 'Netflix Subscription',
    subtitle: 'Billed monthly on the 12th',
    actions: [
      { id: 'edit', label: 'Edit', onSelect: fn() },
      { id: 'pause', label: 'Pause rule', onSelect: fn() },
      { id: 'delete', label: 'Delete rule', onSelect: fn(), destructive: true },
    ],
  },
};

export const WithChevron: Story = {
  args: {
    title: 'Privacy & Security',
    subtitle: 'Manage passwords and sessions',
    chevron: true,
    clickable: true,
  },
};

export const Highlighted: Story = {
  args: {
    title: 'Salary credit',
    subtitle: 'Opened from notification',
    highlighted: true,
    trailing: (
      <Text variant="body-strong" tone="positive">
        +₹1,25,000
      </Text>
    ),
  },
};

export const Disabled: Story = {
  args: {
    title: 'Archived account',
    subtitle: 'Closed on 31 Mar 2025',
    disabled: true,
  },
};

export const AsChild: Story = {
  args: {
    asChild: true,
    title: 'Profile',
    subtitle: 'View account details',
    chevron: true,
  },
  render: (args) => (
    <ListRow {...args}>
      <a href="#" />
    </ListRow>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import {
  Avatar,
  Badge,
  Card,
  ConcealProvider,
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
    wrap: { control: 'boolean' },
    flush: { control: 'boolean' },
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
    wrap: false,
    flush: false,
    asChild: false,
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
    clickable: true,
    onClick: fn(),
    actions: [
      { id: 'edit', label: 'Edit', onSelect: fn() },
      { id: 'pause', label: 'Pause rule', onSelect: fn() },
      { id: 'delete', label: 'Delete rule', onSelect: fn(), tone: 'danger' },
    ],
  },
};

export const WithChevron: Story = {
  args: {
    title: 'Privacy & Security',
    subtitle: 'Manage passwords and sessions',
    chevron: true,
    clickable: true,
    onClick: fn(),
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

export const Wrap: Story = {
  args: {
    title: 'Send at',
    subtitle: 'IST · statement digests and mailbox alerts go out as soon as they happen',
    wrap: true,
    trailing: <Text variant="body-strong">09:00</Text>,
  },
};

export const Flush: Story = {
  args: {
    title: 'Hide amounts',
    subtitle: 'Show ₹ — instead of balances and amounts.',
    flush: true,
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

export const Concealed: Story = {
  args: { title: 'Rent', subtitle: 'Due ₹36,000 on 5 Nov', trailing: '₹36,000' },
  decorators: [
    (Story) => (
      <ConcealProvider concealed>
        <Story />
      </ConcealProvider>
    ),
  ],
  parameters: {
    docs: { description: { story: 'While amounts are hidden (ConcealProvider), every ₹ amount reads "₹ —".' } },
  },
};

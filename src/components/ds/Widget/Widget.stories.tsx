import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { ConcealProvider, ListRow, Text, Widget } from '@/components/ds';

const meta: Meta<typeof Widget> = {
  title: 'DS/Data display/Widget',
  component: Widget,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    loading: { control: 'boolean' },
    error: { control: 'text' },
    errorTitle: { control: 'text' },
    unavailable: { control: 'text' },
    unavailableTitle: { control: 'text' },
    menuItems: { control: 'object' },
    action: { control: 'object' },
    flush: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Widget>;

export const Figure: Story = {
  args: {
    title: 'Spend this month',
    subtitle: 'vs Sep',
    menuItems: [
      { label: 'Edit report', onSelect: fn() },
      { label: 'View full page', onSelect: fn() },
      { label: 'View underlying data', onSelect: fn() },
    ],
    children: (
      <div>
        <Text variant="figure">
          ₹97,044
        </Text>
        <div className="mt-space-4">
          <Text variant="label" tone="danger">
            ▲ 28%
          </Text>
        </div>
      </div>
    ),
  },
};

export const RowsLoading: Story = {
  name: 'Rows loading',
  args: {
    title: 'Upcoming',
    subtitle: 'Next 14 days',
    loading: true,
  },
};

export const Failed: Story = {
  args: {
    title: 'Portfolio',
    subtitle: 'Value and day change',
    errorTitle: "Couldn't load this widget",
    error: 'Prices service did not answer.',
    action: {
      label: 'Retry',
      onSelect: fn(),
    },
  },
};

export const Unavailable: Story = {
  args: {
    title: 'Card spend by month',
    subtitle: 'Report',
    unavailableTitle: 'This report is no longer available',
    unavailable: 'Remove the widget or pick another report.',
    action: {
      label: 'Remove',
      onSelect: fn(),
    },
  },
};

export const WithMenu: Story = {
  name: 'With menu',
  args: {
    title: 'Net worth breakdown',
    subtitle: 'Accounts and investments',
    menuItems: [
      { label: 'Widget settings', onSelect: fn() },
      { label: 'Duplicate as my report', onSelect: fn() },
      { label: 'View full page', onSelect: fn() },
      { label: 'Remove widget', onSelect: fn(), destructive: true },
    ],
    children: (
      <Text variant="figure">
        ₹11,98,842
      </Text>
    ),
  },
};

export const Flush: Story = {
  args: {
    title: 'Upcoming',
    subtitle: 'Next 14 days',
    flush: true,
    children: (
      <>
        <ListRow title="Amex Platinum bill" trailing="₹33,900" />
        <ListRow title="Priya Nair · you owe" trailing="₹12,000" />
        <ListRow title="Regalia Gold bill" trailing="₹44,319" />
      </>
    ),
  },
};

export const Concealed: Story = {
  ...Figure,
  args: { ...Figure.args, title: 'Spend this month', subtitle: '₹12,000 of ₹20,000' },
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

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Text, Widget } from '@/components/ds';

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

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Widget } from './Widget';

const meta: Meta<typeof Widget> = {
  title: 'DS/Data display/Widget',
  component: Widget,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    loading: { control: 'boolean' },
    error: { control: 'boolean' },
    unavailable: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Widget>;

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-space-12 max-w-xl">
      <Widget
        title="Spend this month"
        subtitle="vs Sep"
        menuItems={[
          { label: 'Edit report', onSelect: () => {} },
          { label: 'View full page', onSelect: () => {} },
        ]}
      >
        <div className="font-text text-figure font-extrabold text-ink tabular-nums">
          ₹97,044
        </div>
        <div className="text-label font-bold text-danger mt-space-4">
          ▲ 28%
        </div>
      </Widget>

      <Widget
        title="Upcoming"
        subtitle="Next 14 days"
        loading
      />

      <Widget
        title="Portfolio"
        subtitle="Value and day change"
        error={true}
        errorTitle="Couldn't load this widget"
        errorMessage="Prices service did not answer."
        onRetry={() => {}}
      />

      <Widget
        title="Card spend by month"
        subtitle="Report"
        unavailable={true}
        unavailableTitle="This report is no longer available"
        unavailableMessage="Remove the widget or pick another report."
        onRemove={() => {}}
      />
    </div>
  ),
};

export const Figure: Story = {
  args: {
    title: 'Spend this month',
    subtitle: 'vs Sep',
    menuItems: [
      { label: 'Edit report', onSelect: () => {} },
      { label: 'View full page', onSelect: () => {} },
      { label: 'View underlying data', onSelect: () => {} },
    ],
    children: (
      <div>
        <div className="font-text text-figure font-extrabold text-ink tabular-nums">
          ₹97,044
        </div>
        <div className="text-label font-bold text-danger mt-space-4">
          ▲ 28%
        </div>
      </div>
    ),
  },
};

export const RowsLoading: Story = {
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
    error: true,
    errorTitle: "Couldn't load this widget",
    errorMessage: 'Prices service did not answer.',
    onRetry: () => alert('Retrying prices service...'),
  },
};

export const Unavailable: Story = {
  args: {
    title: 'Card spend by month',
    subtitle: 'Report',
    unavailable: true,
    unavailableTitle: 'This report is no longer available',
    unavailableMessage: 'Remove the widget or pick another report.',
    onRemove: () => alert('Widget removed'),
  },
};

export const WithMenu: Story = {
  args: {
    title: 'Net worth breakdown',
    subtitle: 'Accounts and investments',
    menuItems: [
      { label: 'Widget settings', onSelect: () => {} },
      { label: 'Duplicate as my report', onSelect: () => {} },
      { label: 'View full page', onSelect: () => {} },
      { label: 'Remove widget', onSelect: () => {}, destructive: true },
    ],
    children: (
      <div className="font-text text-figure font-extrabold text-ink tabular-nums">
        ₹11,98,842
      </div>
    ),
  },
};

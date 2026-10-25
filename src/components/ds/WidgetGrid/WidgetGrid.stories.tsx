import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Button, KpiTile, Text, Widget, WidgetGrid } from '@/components/ds';

const items = [
  {
    id: 'net-worth',
    width: 'third' as const,
    label: 'Net worth',
    children: <KpiTile label="Net worth" value="₹11,98,842" context="Across 6 accounts" />,
  },
  {
    id: 'spend',
    width: 'third' as const,
    label: 'Spend this month',
    children: <KpiTile label="Spend this month" value="₹97,044" context="vs ₹75,800 in Sep" />,
  },
  {
    id: 'income',
    width: 'third' as const,
    label: 'Income',
    children: <KpiTile label="Income" value="₹2,45,000" context="Salary credited 1 Oct" />,
  },
  {
    id: 'upcoming',
    width: 'half' as const,
    label: 'Upcoming',
    children: (
      <Widget title="Upcoming" subtitle="Next 14 days">
        <Text variant="body">HDFC Regalia bill ₹18,450 due 28 Oct</Text>
        <Text variant="body">Rent ₹32,000 due 1 Nov</Text>
        <Text variant="body">Netflix ₹649 due 3 Nov</Text>
      </Widget>
    ),
  },
  {
    id: 'portfolio',
    width: 'half' as const,
    label: 'Portfolio',
    children: (
      <Widget title="Portfolio" subtitle="Value and day change">
        <Text variant="figure">₹6,42,310</Text>
        <Text variant="label" tone="positive">
          ▲ ₹4,120 today
        </Text>
      </Widget>
    ),
  },
  {
    id: 'cards',
    width: 'full' as const,
    label: 'Card spend by month',
    children: (
      <Widget title="Card spend by month" subtitle="Report">
        <Text variant="body">Oct ₹97,044 · Sep ₹75,800 · Aug ₹88,210 · Jul ₹64,930</Text>
      </Widget>
    ),
  },
];

const meta = {
  title: 'DS/Layout/WidgetGrid',
  component: WidgetGrid,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    items,
    layout: items.map(({ id, width }) => ({ id, width })),
    editing: false,
    dragLabel: 'Drag to reorder',
    resizeLabel: 'Resize',
    onLayoutChange: fn(),
  },
  argTypes: {
    items: { control: 'object' },
    layout: { control: 'object' },
    defaultLayout: { control: false },
    onLayoutChange: { control: false },
    editing: { control: 'boolean' },
    footer: { control: false },
    dragLabel: { control: 'text' },
    resizeLabel: { control: 'text' },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <WidgetGrid
        {...args}
        onLayoutChange={(layout) => {
          args.onLayoutChange?.(layout);
          updateArgs({ layout });
        }}
      />
    );
  },
} satisfies Meta<typeof WidgetGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const View: Story = {};

export const Edit: Story = {
  args: {
    editing: true,
    items: items.map((item) => ({
      ...item,
      editActions: (
        <Button variant="link" size="sm">
          Remove
        </Button>
      ),
    })),
    footer: <Text variant="body">Drop here · or add a widget</Text>,
  },
};

export const WithHeader: Story = {
  args: {
    editing: true,
    items: [
      {
        id: 'section',
        width: 'full' as const,
        resizable: false,
        label: 'Overview',
        children: <Text variant="heading">Overview</Text>,
      },
      ...items,
    ],
    layout: [{ id: 'section', width: 'full' as const }, ...items.map(({ id, width }) => ({ id, width }))],
  },
};

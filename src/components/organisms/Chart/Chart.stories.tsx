import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '@/components/ds';
import { Chart } from '@/components/organisms';

const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const spend = { field: 'amount', aggregation: 'sum' } as never;

const meta: Meta<typeof Chart> = {
  title: 'Organisms/Chart',
  component: Chart,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-full max-w-container-lg">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    data: { control: 'object' },
    fill: { control: 'boolean' },
    money: { control: 'boolean' },
    yDomain: { control: 'inline-radio', options: ['zero', 'data'] },
  },
};

export default meta;
type Story = StoryObj<typeof Chart>;

export const Bar: Story = {
  args: {
    data: {
      chartType: 'bar',
      categories: months,
      series: [{ name: 'spend', data: [38450, 41200, 36980, 52340, 47810, 61275] }],
      measure: spend,
    },
  },
};

export const Line: Story = {
  args: {
    data: {
      chartType: 'line',
      categories: months,
      series: [
        { name: 'income', data: [185000, 185000, 192500, 185000, 185000, 198000] },
        { name: 'spend', data: [138450, 141200, 136980, 152340, 147810, 161275] },
      ],
      measure: spend,
    },
  },
};

export const Area: Story = {
  args: {
    data: {
      chartType: 'area',
      categories: months,
      series: [{ name: 'net worth', data: [1198842, 1254310, 1301775, 1288430, 1362905, 1425660] }],
      measure: spend,
    },
  },
};

export const StackedBar: Story = {
  args: {
    data: {
      chartType: 'stackedBar',
      categories: months,
      series: [
        { name: 'Food & dining', data: [12450, 14200, 11980, 16340, 13810, 18275] },
        { name: 'Shopping', data: [9800, 7600, 12300, 15400, 11200, 19800] },
        { name: 'Travel', data: [4200, 9800, 3500, 8900, 12300, 7400] },
        { name: 'Bills & utilities', data: [11999, 9600, 9200, 11700, 10500, 15800] },
      ],
      measure: spend,
    },
  },
};

export const Pie: Story = {
  args: {
    data: {
      chartType: 'pie',
      categories: ['Food & dining', 'Shopping', 'Bills & utilities', 'Travel', 'Groceries', 'Fuel', 'Health'],
      series: [{ name: 'spend', data: [18275, 19800, 15800, 7400, 11250, 4350, 2900] }],
      measure: spend,
    },
  },
};

export const Donut: Story = {
  args: {
    data: {
      chartType: 'donut',
      categories: ['HDFC Regalia', 'ICICI Amazon Pay', 'Axis Ace', 'SBI Savings'],
      series: [{ name: 'spend', data: [48210, 26340, 12980, 61275] }],
      measure: spend,
    },
  },
};

export const PriceChart: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The holding price chart: one area series that fills its card and fits the axis to the data range.',
      },
    },
  },
  args: {
    fill: true,
    yDomain: 'data',
    data: {
      chartType: 'area',
      categories: ['1 Jul', '8 Jul', '15 Jul', '22 Jul', '29 Jul', '5 Aug', '12 Aug', '19 Aug'],
      series: [{ name: 'Price', data: [1482.5, 1495.2, 1471.8, 1508.4, 1523.1, 1517.65, 1546.3, 1561.9] }],
      measure: spend,
    },
  },
  render: (args) => (
    <Card title="Price · 1 year" subtitle="Daily close">
      <div className="px-space-16 pb-space-16">
        <div className="aspect-video desk:aspect-wide">
          <Chart {...args} />
        </div>
      </div>
    </Card>
  ),
};

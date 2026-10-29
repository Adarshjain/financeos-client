import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Card } from '@/components/ds';
import { Chart } from '@/components/organisms/Chart/Chart';

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
    columns: { control: 'check', options: ['amount', 'share', 'count', 'avg', 'change'] },
    bars: { control: 'inline-radio', options: ['relative_to_largest', 'share_of_total'] },
    higherIsBetter: { control: 'boolean' },
    rowsLabel: { control: 'text' },
    onOpenRow: { control: false },
    onSelectEntry: { control: false },
    canSelectEntry: { control: false },
    canOpenRow: { control: false },
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

/** Names too long for upright bars on a narrow frame: the bars lie down and every name shows in full. */
export const BarLongNamesNarrow: Story = {
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    data: {
      chartType: 'bar',
      categories: ['Groceries', 'Entertainment', 'Transport', 'Dining out', 'Utilities', 'Health'],
      series: [{ name: 'spend', data: [18450, 12200, 9980, 8340, 6810, 3275] }],
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

const sub = (label: string, value: number, count: number) => ({ label, value, count });

const rankedSpend = {
  chartType: 'breakdown',
  dimension: 'category',
  categories: ['Food & dining', 'Shopping', 'Bills & utilities', 'Travel', 'Groceries', 'Fuel'],
  series: [{ name: 'spend', data: [48210, 36840, 29600, 21450, 18275, 9350] }],
  measure: spend,
  breakdown: {
    rows: [
      { count: 42, avg: 1148, previousCount: 39, subRows: [] },
      { count: 18, avg: 2047, previousCount: 21, subRows: [] },
      { count: 11, avg: 2691, previousCount: 11, subRows: [] },
      { count: 6, avg: 3575, previousCount: 4, subRows: [] },
      { count: 24, avg: 761, previousCount: 26, subRows: [] },
      { count: 9, avg: 1039, previousCount: 8, subRows: [] },
    ],
    total: 163725,
    previousTotal: 158900,
  },
} as never;

const withBreakdownCard = (Story: React.ComponentType) => (
  <Card>
    <Story />
  </Card>
);

export const BreakdownRelativeBars: Story = {
  decorators: [withBreakdownCard],
  parameters: {
    docs: {
      description: {
        story: 'A ranked list: each bar is measured against the largest row, in the row\u2019s own chart colour.',
      },
    },
  },
  args: { data: rankedSpend, columns: ['amount', 'share', 'count'], rowsLabel: 'Category', onOpenRow: fn() },
};

export const BreakdownShareBars: Story = {
  decorators: [withBreakdownCard],
  parameters: {
    docs: { description: { story: 'Each bar is measured against the total, so it reads as the row\u2019s share.' } },
  },
  args: { data: rankedSpend, bars: 'share_of_total', columns: ['amount', 'share', 'avg'], rowsLabel: 'Category', onOpenRow: fn() },
};

export const BreakdownWithSubRows: Story = {
  decorators: [withBreakdownCard],
  parameters: {
    docs: {
      description: {
        story: 'A row with sub-rows expands on a press; its underlying data opens from the link inside.',
      },
    },
  },
  args: {
    data: {
      chartType: 'breakdown',
      dimension: 'category',
      categories: ['Food & dining', 'Shopping', 'Travel'],
      series: [{ name: 'spend', data: [48210, 36840, 21450] }],
      measure: spend,
      previous: { series: [{ name: 'spend', data: [44150, 41200, 21450] }], dateRange: null },
      breakdown: {
        rows: [
          {
            count: 42,
            avg: 1148,
            previousCount: 39,
            subRows: [
              sub('HDFC Regalia', 27640, 24),
              sub('ICICI Amazon Pay', 14320, 13),
              sub('SBI Savings', 6250, 5),
            ],
          },
          { count: 18, avg: 2047, previousCount: 21, subRows: [sub('HDFC Regalia', 25400, 11), sub('Axis Ace', 11440, 7)] },
          { count: 6, avg: 3575, previousCount: 4, subRows: [sub('Axis Ace', 21450, 6)] },
        ],
        total: 106500,
        previousTotal: 106800,
      },
    } as never,
    columns: ['amount', 'share', 'count', 'change'],
    higherIsBetter: false,
    rowsLabel: 'Category',
    onOpenRow: fn(),
  },
};

export const BreakdownWithOtherRow: Story = {
  decorators: [withBreakdownCard],
  parameters: {
    docs: {
      description: {
        story: 'With a top limit the rest fold into one Other row in the neutral chart colour; it neither expands nor opens.',
      },
    },
  },
  args: {
    data: {
      chartType: 'breakdown',
      dimension: 'category',
      categories: ['Food & dining', 'Shopping', 'Bills & utilities', 'Other'],
      series: [{ name: 'spend', data: [48210, 36840, 29600, 21300] }],
      measure: spend,
      other: { index: 3, foldedCount: 5 },
      breakdown: {
        rows: [
          { count: 42, avg: 1148, previousCount: 39, subRows: [] },
          { count: 18, avg: 2047, previousCount: 21, subRows: [] },
          { count: 11, avg: 2691, previousCount: 11, subRows: [] },
          { count: 17, avg: 1253, previousCount: 15, subRows: [] },
        ],
        total: 135950,
        previousTotal: 158900,
      },
    } as never,
    columns: ['amount', 'share', 'count'],
    rowsLabel: 'Category',
    onOpenRow: fn(),
  },
};

export const Sparkline: Story = {
  decorators: [
    (Story) => (
      <div className="w-space-96">
        <Story />
      </div>
    ),
  ],
  args: {
    data: {
      chartType: 'sparkline',
      categories: months,
      series: [{ name: 'net worth', data: [1420000, 1465000, 1448000, 1512000, 1560000, 1618000] }],
      measure: spend,
    },
  },
};

// A rolling window ending today, so the calendar always has recent days.
const heatDays = Array.from({ length: 180 }, (_, i) => {
  const d = new Date(Date.now() - (179 - i) * 86_400_000);
  return d.toISOString().slice(0, 10);
});

const heatData = {
  chartType: 'heatmap',
  categories: heatDays,
  series: [
    {
      name: 'spend',
      data: heatDays.map((_, i) => (i % 7 === 3 ? 0 : ((i * 37) % 11) * 450 + 120)),
    },
  ],
  measure: spend,
} as never;

export const Heatmap: Story = {
  args: { data: heatData },
};

export const Pressable: Story = {
  parameters: {
    docs: {
      description: {
        story: 'With onSelectEntry the bars, points, slices and their legend rows, and heatmap days with a value, are pressable.',
      },
    },
  },
  args: {
    data: {
      chartType: 'bar',
      categories: months,
      series: [{ name: 'spend', data: [38450, 41200, 36980, 52340, 47810, 61275] }],
      measure: spend,
    },
    onSelectEntry: fn(),
  },
};

export const PressableSomeEntries: Story = {
  parameters: {
    docs: {
      description: {
        story: 'canSelectEntry rejects an entry: the Other slice has no cursor, hover or press state and its legend row is plain text.',
      },
    },
  },
  args: {
    data: {
      chartType: 'donut',
      categories: ['Food & dining', 'Shopping', 'Travel', 'Other'],
      series: [{ name: 'spend', data: [48210, 36840, 21450, 12600] }],
      measure: spend,
    },
    onSelectEntry: fn(),
    canSelectEntry: (entry) => entry.key !== 'Other',
  },
};

export const PressableDonut: Story = {
  args: {
    data: {
      chartType: 'donut',
      categories: ['Food & dining', 'Shopping', 'Travel', 'Bills'],
      series: [{ name: 'spend', data: [48210, 36840, 21450, 12600] }],
      measure: spend,
    },
    onSelectEntry: fn(),
  },
};

export const PressableHeatmap: Story = {
  args: { data: heatData, onSelectEntry: fn() },
};

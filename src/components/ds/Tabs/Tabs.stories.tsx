import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { type TabItem, Tabs, type TabsProps, Text } from '@/components/ds';

/** Item rows are edited as JSON in Controls; `links` and `countsLoaded` turn them into route tabs and hide counts. */
type StoryArgs = Omit<TabsProps, 'items'> & {
  items: Omit<TabItem, 'asChild' | 'children'>[];
  links: boolean;
  countsLoaded: boolean;
};

const meta: Meta<StoryArgs> = {
  title: 'DS/Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A tab strip that switches between sibling views of one section. Turn on links to make each tab a route link (here hash links stand in for the app\'s Link): arrow keys then only move focus, and click or Enter follows the link. Turn off countsLoaded to see tabs while their counts load: each count appears when it arrives. Edit items to change labels, counts or disable a tab; at phone width the strip scrolls sideways.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    value: { control: 'text', description: 'The current tab (the current route, for route tabs)' },
    items: { control: 'object' },
    links: { control: 'boolean', description: 'Render each item as a link (`asChild` + `children`)' },
    countsLoaded: { control: 'boolean', description: 'Off: counts are still loading (`count` undefined)' },
    activationMode: { control: 'inline-radio', options: [undefined, 'automatic', 'manual'] },
    defaultValue: { control: false },
    children: { control: false },
  },
  args: {
    value: 'statements',
    links: true,
    countsLoaded: true,
    items: [
      { value: 'overview', label: 'Overview' },
      { value: 'statements', label: 'Statements', count: 3 },
      { value: 'cards', label: 'Cards', count: 2 },
      { value: 'rewards', label: 'Rewards' },
    ],
    onValueChange: fn(),
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  name: 'Tabs',
  render: function Render({ items, links, countsLoaded, ...args }) {
    const [{ value }, updateArgs] = useArgs<StoryArgs>();
    const current = items.find((item) => item.value === value);
    return (
      <div className="flex flex-col gap-space-12">
        <Tabs
          {...args}
          value={value}
          onValueChange={(next) => {
            args.onValueChange?.(next);
            updateArgs({ value: next });
          }}
          items={items.map((item) => ({
            ...item,
            count: countsLoaded ? item.count : undefined,
            ...(links ? { asChild: true, children: <a href={`#${item.value}`} /> } : {}),
          }))}
        />
        <Text tone="ink-3">Showing {current?.label ?? 'no tab'}</Text>
      </div>
    );
  },
};

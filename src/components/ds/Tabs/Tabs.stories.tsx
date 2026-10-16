import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/components/ds';

const meta = {
  title: 'DS/Navigation/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    value: { control: 'text' },
    defaultValue: {
      control: 'text',
      description:
        'Initial active tab value. In items mode, defaults to the first item value. Pass empty string ("") to start with no tab selected.',
    },
  },
  args: {
    onValueChange: fn(),
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Tabs
        {...args}
        value={value}
        onValueChange={(val) => {
          args.onValueChange?.(val);
          updateArgs({ value: val });
        }}
      />
    );
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  args: {
    value: 'rules',
    items: [
      { value: 'all', label: 'All' },
      { value: 'rules', label: 'Rules' },
      { value: 'categories', label: 'Categories' },
      { value: 'import', label: 'Import' },
    ],
  },
};

export const WithCounts: Story = {
  args: {
    value: 'statements',
    items: [
      { value: 'overview', label: 'Overview' },
      { value: 'statements', label: 'Statements', count: 3 },
      { value: 'cards', label: 'Cards', count: 2 },
    ],
  },
};

export const InteractiveWithContent: Story = {
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Tabs
        {...args}
        value={value}
        onValueChange={(val) => {
          args.onValueChange?.(val);
          updateArgs({ value: val });
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="pt-space-12">
          <Text variant="body" tone="ink-2">
            Viewing all transaction records across all connected accounts.
          </Text>
        </TabsContent>
        <TabsContent value="rules" className="pt-space-12">
          <Text variant="body" tone="ink-2">
            Review and manage 12 categorization rules.
          </Text>
        </TabsContent>
        <TabsContent value="categories" className="pt-space-12">
          <Text variant="body" tone="ink-2">
            Edit category trees and budget allocations.
          </Text>
        </TabsContent>
        <TabsContent value="import" className="pt-space-12">
          <Text variant="body" tone="ink-2">
            Import statements via CSV or PDF dropzone.
          </Text>
        </TabsContent>
      </Tabs>
    );
  },
  args: {
    value: 'rules',
  },
};

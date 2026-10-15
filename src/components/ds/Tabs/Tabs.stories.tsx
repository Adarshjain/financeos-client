import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

const meta = {
  title: 'DS/Navigation/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    value: { control: 'text' },
    defaultValue: { control: 'text' },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => {
    return (
      <div className="space-y-space-24 max-w-2xl bg-canvas p-space-16 rounded-ds-lg border border-line">
        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Plain
          </span>
          <Tabs
            defaultValue="rules"
            items={[
              { value: 'all', label: 'All' },
              { value: 'rules', label: 'Rules' },
              { value: 'categories', label: 'Categories' },
              { value: 'import', label: 'Import' },
            ]}
          />
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            With counts
          </span>
          <Tabs
            defaultValue="statements"
            items={[
              { value: 'overview', label: 'Overview' },
              { value: 'statements', label: 'Statements', count: 3 },
              { value: 'cards', label: 'Cards', count: 2 },
            ]}
          />
        </div>

        <div className="space-y-space-4">
          <span className="font-text text-caption font-semibold text-ink-3">
            Scrolling on phone
          </span>
          <div className="max-w-xs">
            <Tabs
              defaultValue="tradebook"
              items={[
                { value: 'holdings', label: 'Holdings' },
                { value: 'tradebook', label: 'Tradebook', count: 38 },
                { value: 'dividends', label: 'Dividends', count: 5 },
                { value: 'fno', label: 'F&O', count: 5 },
                {
                  value: 'corp_actions',
                  label: 'Corporate actions',
                  count: 2,
                },
              ]}
            />
          </div>
        </div>
      </div>
    );
  },
};

function PlainInteractiveDemo() {
  const [val, setVal] = useState('rules');
  return (
    <Tabs
      value={val}
      onValueChange={setVal}
      items={[
        { value: 'all', label: 'All' },
        { value: 'rules', label: 'Rules' },
        { value: 'categories', label: 'Categories' },
        { value: 'import', label: 'Import' },
      ]}
    />
  );
}

export const Plain: Story = {
  render: () => <PlainInteractiveDemo />,
};

function WithCountsInteractiveDemo() {
  const [val, setVal] = useState('statements');
  return (
    <Tabs
      value={val}
      onValueChange={setVal}
      items={[
        { value: 'overview', label: 'Overview' },
        { value: 'statements', label: 'Statements', count: 3 },
        { value: 'cards', label: 'Cards', count: 2 },
      ]}
    />
  );
}

export const WithCounts: Story = {
  render: () => <WithCountsInteractiveDemo />,
};

function ScrollingOnPhoneDemo() {
  const [val, setVal] = useState('tradebook');
  return (
    <div className="max-w-xs bg-canvas p-space-8 rounded-ds-lg border border-line">
      <Tabs
        value={val}
        onValueChange={setVal}
        items={[
          { value: 'holdings', label: 'Holdings' },
          { value: 'tradebook', label: 'Tradebook', count: 38 },
          { value: 'dividends', label: 'Dividends', count: 5 },
          { value: 'fno', label: 'F&O', count: 5 },
          { value: 'corp_actions', label: 'Corporate actions', count: 2 },
        ]}
      />
    </div>
  );
}

export const ScrollingOnPhone: Story = {
  render: () => <ScrollingOnPhoneDemo />,
};

function InteractiveWithContentDemo() {
  return (
    <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg border border-line">
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <p className="font-text text-body text-ink-2">
            Showing all transaction categorization records.
          </p>
        </TabsContent>
        <TabsContent value="rules">
          <p className="font-text text-body text-ink-2">
            Automated transaction rules and filters.
          </p>
        </TabsContent>
        <TabsContent value="categories">
          <p className="font-text text-body text-ink-2">
            Configured budget categories and rules.
          </p>
        </TabsContent>
        <TabsContent value="import">
          <p className="font-text text-body text-ink-2">
            Bank statement import jobs and parsers.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const InteractiveWithContent: Story = {
  render: () => <InteractiveWithContentDemo />,
};

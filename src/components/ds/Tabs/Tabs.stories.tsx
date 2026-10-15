import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useArgs } from 'storybook/preview-api';

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
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Tabs
        {...args}
        value={value}
        onValueChange={(val) => updateArgs({ value: val })}
      />
    );
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => {
    const InteractiveAll = () => {
      const [v1, setV1] = useState('rules');
      const [v2, setV2] = useState('statements');
      const [v3, setV3] = useState('tradebook');
      return (
        <div className="space-y-space-24 max-w-2xl bg-canvas p-space-16 rounded-ds-lg border border-line">
          <div className="space-y-space-4">
            <span className="font-text text-caption font-semibold text-ink-3">
              Plain
            </span>
            <Tabs
              value={v1}
              onValueChange={setV1}
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
              value={v2}
              onValueChange={setV2}
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
                value={v3}
                onValueChange={setV3}
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
    };
    return <InteractiveAll />;
  },
};

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

export const ScrollingOnPhone: Story = {
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <div className="max-w-xs bg-canvas p-space-8 rounded-ds-lg border border-line">
        <Tabs
          {...args}
          value={value}
          onValueChange={(val) => updateArgs({ value: val })}
        />
      </div>
    );
  },
  args: {
    value: 'tradebook',
    items: [
      { value: 'holdings', label: 'Holdings' },
      { value: 'tradebook', label: 'Tradebook', count: 38 },
      { value: 'dividends', label: 'Dividends', count: 5 },
      { value: 'fno', label: 'F&O', count: 5 },
      { value: 'corp_actions', label: 'Corporate actions', count: 2 },
    ],
  },
};

export const InteractiveWithContent: Story = {
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <div className="max-w-md bg-canvas p-space-16 rounded-ds-lg border border-line">
        <Tabs
          {...args}
          value={value}
          onValueChange={(val) => updateArgs({ value: val })}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <p className="font-text text-body text-ink-2">
              Viewing all transaction records across all connected accounts.
            </p>
          </TabsContent>
          <TabsContent value="rules">
            <p className="font-text text-body text-ink-2">
              Review and manage 12 categorization rules.
            </p>
          </TabsContent>
          <TabsContent value="categories">
            <p className="font-text text-body text-ink-2">
              Edit category trees and budget allocations.
            </p>
          </TabsContent>
          <TabsContent value="import">
            <p className="font-text text-body text-ink-2">
              Import statements via CSV or PDF dropzone.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    );
  },
  args: {
    value: 'rules',
  },
};

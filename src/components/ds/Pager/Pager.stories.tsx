import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Card } from '../Card/Card';
import { Pager } from './Pager';

const meta: Meta<typeof Pager> = {
  title: 'DS/Navigation/Pager',
  component: Pager,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Card className="max-w-3xl overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['auto', 'desktop', 'phone'],
    },
    borderPosition: {
      control: 'select',
      options: ['top', 'bottom', 'none'],
    },
    page: { control: 'number' },
    size: { control: 'number' },
    totalElements: { control: 'number' },
    totalPages: { control: 'number' },
    unit: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Pager>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-3xl">
      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Desktop (First page of 4)
        </h4>
        <Card className="overflow-hidden">
          <Pager
            page={0}
            size={50}
            totalElements={182}
            totalPages={4}
            unit="transaction"
            onPageChange={() => {}}
            onSizeChange={() => {}}
          />
        </Card>
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Phone Variant
        </h4>
        <Card className="max-w-sm overflow-hidden">
          <Pager
            variant="phone"
            page={0}
            size={50}
            totalElements={182}
            totalPages={4}
            onPageChange={() => {}}
          />
        </Card>
      </div>

      <div>
        <h4 className="text-label font-semibold text-ink-3 mb-space-8">
          Single Page (no navigation arrows)
        </h4>
        <Card className="overflow-hidden">
          <Pager
            page={0}
            size={50}
            totalElements={25}
            totalPages={1}
            unit="needing review"
            onPageChange={() => {}}
            onSizeChange={() => {}}
          />
        </Card>
      </div>
    </div>
  ),
};

export const Desktop: Story = {
  name: 'Desktop',
  args: {
    page: 0,
    size: 50,
    totalElements: 182,
    totalPages: 4,
    unit: 'transaction',
    variant: 'desktop',
    onPageChange: () => {},
    onSizeChange: () => {},
  },
};

export const Phone: Story = {
  name: 'Phone',
  decorators: [
    (Story) => (
      <Card className="max-w-sm overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  args: {
    variant: 'phone',
    page: 0,
    size: 50,
    totalElements: 182,
    totalPages: 4,
    onPageChange: () => {},
  },
};

export const SinglePage: Story = {
  name: 'Single page',
  args: {
    page: 0,
    size: 50,
    totalElements: 25,
    totalPages: 1,
    unit: 'needing review',
    onPageChange: () => {},
    onSizeChange: () => {},
  },
};

export const MiddlePage: Story = {
  name: 'Middle page',
  args: {
    page: 4,
    size: 25,
    totalElements: 250,
    totalPages: 10,
    unit: 'statement',
    onPageChange: () => {},
    onSizeChange: () => {},
  },
};

const InteractivePagerStory: React.FC = () => {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const totalElements = 182;

  return (
    <Card className="max-w-3xl overflow-hidden">
      <div className="p-space-20 text-body text-ink-2">
        Simulated content for page {page + 1} ({size} rows per page)
      </div>
      <Pager
        page={page}
        size={size}
        totalElements={totalElements}
        unit="transaction"
        onPageChange={setPage}
        onSizeChange={(newSize) => {
          setSize(newSize);
          setPage(0);
        }}
      />
    </Card>
  );
};

export const Interactive: Story = {
  name: 'Interactive',
  render: () => <InteractivePagerStory />,
};


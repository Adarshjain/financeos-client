import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Card, Pager } from '@/components/ds';

const meta: Meta<typeof Pager> = {
  title: 'DS/Navigation/Pager',
  component: Pager,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Card className="max-w-3xl">
        <Story />
      </Card>
    ),
  ],
  args: {
    onPageChange: fn(),
    onSizeChange: fn(),
  },
  argTypes: {
    borderPosition: {
      control: 'select',
      options: ['top', 'bottom', 'none'],
    },
    page: { control: 'number' },
    size: { control: 'number' },
    totalElements: { control: 'number' },
    totalPages: { control: 'number' },
    unit: { control: 'text' },
    sizeOptions: { control: 'object' },
  },
  render: function Render(args) {
    const [{ page, size }, updateArgs] = useArgs();
    return (
      <Pager
        {...args}
        page={page ?? args.page}
        size={size ?? args.size}
        onPageChange={(p) => {
          args.onPageChange?.(p);
          updateArgs({ page: p });
        }}
        onSizeChange={(s) => {
          args.onSizeChange?.(s);
          updateArgs({ size: s, page: 0 });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof Pager>;

export const Desktop: Story = {
  name: 'Desktop',
  args: {
    page: 0,
    size: 50,
    totalElements: 182,
    totalPages: 4,
    unit: 'transactions',
    sizeLabel: (n) => `${n} / page`,
  },
};

export const MiddlePage: Story = {
  name: 'Middle page',
  args: {
    page: 4,
    size: 25,
    totalElements: 250,
    totalPages: 10,
    unit: 'statements',
    sizeLabel: (n) => `${n} / page`,
  },
};

export const SinglePage: Story = {
  name: 'Single page',
  args: {
    page: 0,
    size: 50,
    totalElements: 25,
    totalPages: 1,
    unit: 'items',
    sizeLabel: (n) => `${n} / page`,
  },
};

export const CustomSummary: Story = {
  name: 'Custom summary',
  args: {
    page: 0,
    size: 50,
    totalElements: 182,
    totalPages: 4,
    summary: ({ start, end, total }) => `${start}–${end} of ${total} transactions`,
    sizeLabel: (n) => `${n} / page`,
  },
};

export const Interactive: Story = {
  name: 'Interactive',
  args: {
    page: 0,
    size: 50,
    totalElements: 182,
    unit: 'transactions',
    sizeLabel: (n) => `${n} / page`,
  },
};

export const Phone: Story = {
  name: 'Phone',
  globals: {
    viewport: { value: 'phone', isRotated: false },
  },
  args: {
    page: 0,
    size: 50,
    totalElements: 182,
    totalPages: 4,
    unit: 'transactions',
    sizeLabel: (n) => `${n} / page`,
  },
};

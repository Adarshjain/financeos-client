import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '../Card/Card';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'DS/Feedback/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    width: { control: 'text' },
    circle: { control: 'boolean' },
  },
  args: {
    width: '60%',
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 max-w-4xl font-text">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Rows
        </div>
        <Card className="p-space-16 flex flex-col gap-space-12">
          <div className="flex gap-space-12 items-center">
            <Skeleton circle className="w-space-32" />
            <div className="flex-1 flex flex-col gap-space-6">
              <Skeleton width="60%" />
              <Skeleton width="85%" />
            </div>
          </div>
          <div className="flex gap-space-12 items-center">
            <Skeleton circle className="w-space-32" />
            <div className="flex-1 flex flex-col gap-space-6">
              <Skeleton width="60%" />
              <Skeleton width="85%" />
            </div>
          </div>
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Figure
        </div>
        <Card className="p-space-16 flex flex-col">
          <Skeleton width="40%" />
          <Skeleton width="70%" className="mt-space-10 h-space-24" />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Widget rows
        </div>
        <Card className="p-space-16 flex flex-col gap-space-12">
          <div className="font-extrabold text-heading text-ink">Upcoming</div>
          <div className="flex flex-col gap-space-8">
            <Skeleton width="100%" />
            <Skeleton width="80%" />
          </div>
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Table
        </div>
        <Card className="p-space-16 flex flex-col gap-space-12">
          <div className="grid grid-cols-[60px_1fr_70px] gap-space-12">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
          <div className="grid grid-cols-[60px_1fr_70px] gap-space-12">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
          <div className="grid grid-cols-[60px_1fr_70px] gap-space-12">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        </Card>
      </div>
    </div>
  ),
};

export const Single: Story = {
  name: 'Single bar',
  args: {
    width: '60%',
  },
  render: (args) => (
    <Card className="max-w-md p-space-16">
      <Skeleton {...args} />
    </Card>
  ),
};

export const Rows: Story = {
  name: 'Rows',
  args: {
    width: '60%',
  },
  render: (args) => (
    <Card className="max-w-md p-space-16 flex flex-col gap-space-12 font-text">
      <div className="flex gap-space-12 items-center">
        <Skeleton circle className="w-space-32" />
        <div className="flex-1 flex flex-col gap-space-6">
          <Skeleton {...args} />
          <Skeleton width="85%" />
        </div>
      </div>
      <div className="flex gap-space-12 items-center">
        <Skeleton circle className="w-space-32" />
        <div className="flex-1 flex flex-col gap-space-6">
          <Skeleton {...args} />
          <Skeleton width="85%" />
        </div>
      </div>
    </Card>
  ),
};

export const Figure: Story = {
  name: 'Figure',
  args: {
    width: '70%',
  },
  render: (args) => (
    <Card className="max-w-xs p-space-16 flex flex-col font-text">
      <Skeleton width="40%" />
      <Skeleton {...args} className="mt-space-10 h-space-24" />
    </Card>
  ),
};

export const WidgetRows: Story = {
  name: 'Widget rows',
  args: {
    width: '100%',
  },
  render: (args) => (
    <Card className="max-w-md p-space-16 flex flex-col gap-space-12 font-text">
      <div className="font-extrabold text-heading text-ink">Upcoming</div>
      <div className="flex flex-col gap-space-8">
        <Skeleton {...args} />
        <Skeleton width="80%" />
      </div>
    </Card>
  ),
};

export const Table: Story = {
  name: 'Table',
  args: {
    width: '100%',
  },
  render: (args) => (
    <Card className="max-w-md p-space-16 flex flex-col gap-space-12 font-text">
      <div className="grid grid-cols-[60px_1fr_70px] gap-space-12">
        <Skeleton {...args} />
        <Skeleton {...args} />
        <Skeleton {...args} />
      </div>
      <div className="grid grid-cols-[60px_1fr_70px] gap-space-12">
        <Skeleton {...args} />
        <Skeleton {...args} />
        <Skeleton {...args} />
      </div>
      <div className="grid grid-cols-[60px_1fr_70px] gap-space-12">
        <Skeleton {...args} />
        <Skeleton {...args} />
        <Skeleton {...args} />
      </div>
    </Card>
  ),
};

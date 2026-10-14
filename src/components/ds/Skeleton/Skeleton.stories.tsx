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
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Rows: Story = {
  name: 'Rows',
  render: () => (
    <Card className="max-w-md p-space-16 flex flex-col gap-space-12">
      <div className="flex gap-space-12 items-center">
        <Skeleton width={32} height={32} className="rounded-ds-md" />
        <div className="flex-1 flex flex-col gap-space-6">
          <Skeleton width="60%" />
          <Skeleton width="85%" height={10} />
        </div>
      </div>
      <div className="flex gap-space-12 items-center">
        <Skeleton width={32} height={32} className="rounded-ds-md" />
        <div className="flex-1 flex flex-col gap-space-6">
          <Skeleton width="60%" />
          <Skeleton width="85%" height={10} />
        </div>
      </div>
    </Card>
  ),
};

export const Figure: Story = {
  name: 'Figure',
  render: () => (
    <Card className="max-w-xs p-space-16 flex flex-col">
      <Skeleton width="40%" />
      <Skeleton width="70%" height={22} className="mt-space-10" />
    </Card>
  ),
};

export const WidgetRows: Story = {
  name: 'Widget rows',
  render: () => (
    <Card className="max-w-md p-space-16 flex flex-col gap-space-12">
      <div className="font-extrabold text-heading text-ink">Upcoming</div>
      <div className="flex flex-col gap-space-8">
        <Skeleton width="100%" />
        <Skeleton width="80%" />
      </div>
    </Card>
  ),
};

export const Table: Story = {
  name: 'Table',
  render: () => (
    <Card className="max-w-md p-space-16 flex flex-col gap-space-12">
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
  ),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 max-w-4xl">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Rows
        </div>
        <Card className="p-space-16 flex flex-col gap-space-12">
          <div className="flex gap-space-12 items-center">
            <Skeleton width={32} height={32} className="rounded-ds-md" />
            <div className="flex-1 flex flex-col gap-space-6">
              <Skeleton width="60%" />
              <Skeleton width="85%" height={10} />
            </div>
          </div>
          <div className="flex gap-space-12 items-center">
            <Skeleton width={32} height={32} className="rounded-ds-md" />
            <div className="flex-1 flex flex-col gap-space-6">
              <Skeleton width="60%" />
              <Skeleton width="85%" height={10} />
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
          <Skeleton width="70%" height={22} className="mt-space-10" />
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

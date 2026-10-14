import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '../Card/Card';
import { DateGroupHeader } from './DateGroupHeader';

const meta: Meta<typeof DateGroupHeader> = {
  title: 'DS/Data display/DateGroupHeader',
  component: DateGroupHeader,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DateGroupHeader>;

export const Day: Story = {
  args: {
    variant: 'day',
    date: '12 Oct',
    weekday: 'Mon',
    borderTop: false,
  },
};

export const Month: Story = {
  args: {
    variant: 'month',
    date: 'September 2026',
    summary: '61 transactions · out ₹1,05,219',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-space-16 max-w-md">
      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Day header (sticky phone band)
        </div>
        <Card className="p-0 overflow-hidden">
          <DateGroupHeader date="12 Oct" weekday="Mon" borderTop={false} />
          <div className="p-space-14 text-body text-ink">
            BigBasket · ₹3,600.00
          </div>
          <DateGroupHeader date="11 Oct" weekday="Sun" />
          <div className="p-space-14 text-body text-ink">
            Swiggy · ₹450.00
          </div>
        </Card>
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Month header (desktop table / section separation)
        </div>
        <Card className="p-0 overflow-hidden">
          <DateGroupHeader
            variant="month"
            date="September 2026"
            summary="61 transactions · out ₹1,05,219"
          />
          <div className="p-space-14 text-body text-ink">
            September transaction rows...
          </div>
        </Card>
      </div>
    </div>
  ),
};

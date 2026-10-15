import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '../Card/Card';
import { CalendarDay, DateTile, MonthCalendar } from './DateTile';

const meta: Meta<typeof DateTile> = {
  title: 'DS/Data display/DateTile',
  component: DateTile,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DateTile>;

export const Tile: Story = {
  args: {
    day: 15,
    month: 'OCT',
  },
};

const sampleDays: CalendarDay[] = Array.from({ length: 21 }, (_, i) => {
  const day = i + 1;
  if (day === 5) {
    return { day, events: [{ kind: 'emi', label: 'Car Loan EMI' }] };
  }
  if (day === 13) {
    return { day, today: true };
  }
  if (day === 15) {
    return { day, events: [{ kind: 'bill', label: 'Amex Bill' }] };
  }
  return { day };
});

export const Calendar: StoryObj<typeof MonthCalendar> = {
  render: () => (
    <Card className="max-w-sm p-0 overflow-hidden">
      <MonthCalendar borderTop={false} days={sampleDays} />
    </Card>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-space-16 max-w-sm">
      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-6">
          Date tiles (Upcoming rows)
        </div>
        <div className="flex gap-space-16 items-center">
          <DateTile day={15} month="OCT" />
          <DateTile day={23} month="OCT" />
          <DateTile day={28} month="OCT" />
        </div>
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-6">
          Month calendar (Upcoming view)
        </div>
        <Card className="p-0 overflow-hidden">
          <MonthCalendar borderTop={false} days={sampleDays} />
        </Card>
      </div>
    </div>
  ),
};

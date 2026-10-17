import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { type CalendarDay, Card, MonthCalendar } from '@/components/ds';

const sampleDays: CalendarDay[] = [
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5, events: [{ tone: 'info', label: 'Payment due' }] },
  { day: 6 },
  { day: 7 },
  { day: 8 },
  { day: 9 },
  { day: 10 },
  { day: 11 },
  { day: 12 },
  { day: 13, today: true },
  { day: 14 },
  { day: 15, events: [{ tone: 'warning', label: 'Bill reminder' }] },
  { day: 16 },
  { day: 17 },
  { day: 18 },
  { day: 19 },
  { day: 20 },
  { day: 21 },
];

const meta: Meta<typeof MonthCalendar> = {
  title: 'DS/Data display/MonthCalendar',
  component: MonthCalendar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The monthly calendar grid for overview event bars or date picking.',
      },
    },
  },
  decorators: [
    (Story) => (
      <Card className="max-w-sm p-0 overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  args: {
    today: '2026-10-13',
    onSelectDay: fn(),
    onValueChange: fn(),
    onMonthChange: fn(),
    onToday: fn(),
    onClear: fn(),
  },
  argTypes: {
    mode: { control: 'select', options: ['events', 'picker'] },
    range: { control: 'boolean' },
    borderTop: { control: 'boolean' },
    selectedDay: { control: 'number' },
    today: { control: 'text' },
    month: { control: 'text' },
    minDate: { control: 'text' },
    maxDate: { control: 'text' },
    showFooter: { control: 'boolean' },
    days: { table: { disable: true } },
    weekdays: { table: { disable: true } },
  },
};

export default meta;
type Story = StoryObj<typeof MonthCalendar>;

export const Events: Story = {
  args: {
    mode: 'events',
    borderTop: false,
    days: sampleDays,
    selectedDay: 13,
  },
};

export const Picker: Story = {
  args: {
    mode: 'picker',
    month: '2026-10-01',
    value: '2026-10-15',
  },
};

export const PickerRange: Story = {
  args: {
    mode: 'picker',
    range: true,
    month: '2026-10-01',
    value: { start: '2026-10-10', end: '2026-10-20' },
  },
};

export const PickerMinMax: Story = {
  args: {
    mode: 'picker',
    month: '2026-10-01',
    value: '2026-10-15',
    minDate: '2026-10-05',
    maxDate: '2026-10-25',
  },
};

export const PickerWithFooter: Story = {
  args: {
    mode: 'picker',
    month: '2026-10-01',
    value: '2026-10-15',
    showFooter: true,
  },
};

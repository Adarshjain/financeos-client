import type { Decorator, Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import {
  Button,
  type CalendarEvent,
  Card,
  CardHeader,
  formatDate,
  formatMonth,
  Icon,
  ListRow,
  MonthCalendar,
  Text,
} from '@/components/ds';

/** A calendar event plus what the page's day list shows for it. */
interface UpcomingItem extends CalendarEvent {
  title: string;
  amount?: number;
  payable?: boolean;
}

const TODAY = '2026-10-13';

const upcoming: UpcomingItem[] = [
  { id: 'sbi-stmt', date: '2026-10-03', label: 'SBI statement', tone: 'danger', title: 'SBI Card statement missing' },
  { id: 'home-emi', date: '2026-10-05', label: 'Home EMI ₹36.6K', tone: 'danger', title: 'HDFC Home Loan EMI', amount: 36620, payable: true },
  { id: 'car-emi', date: '2026-10-07', label: 'Car EMI ₹17.7K', tone: 'danger', title: 'HDFC Car Loan EMI', amount: 17740, payable: true },
  { id: 'sbi-exp', date: '2026-10-08', label: 'SBI stmt expected', tone: 'warning', title: 'SBI Card statement expected' },
  { id: 'personal-emi', date: '2026-10-10', label: 'Personal EMI ₹9.6K', tone: 'danger', title: 'ICICI Personal Loan EMI', amount: 9580, payable: true },
  { id: 'amex-bill', date: '2026-10-15', label: 'Amex bill ₹33.9K', tone: 'warning', title: 'Amex Platinum Travel bill', amount: 33900, payable: true },
  { id: 'sip', date: '2026-10-15', label: 'SIP ₹10K', tone: 'neutral', title: 'Parag Parikh Flexi Cap SIP', amount: 10000 },
  { id: 'airtel', date: '2026-10-15', label: 'Airtel ₹1.2K', tone: 'neutral', title: 'Airtel postpaid', amount: 1179, payable: true },
  { id: 'netflix', date: '2026-10-15', label: 'Netflix ₹649', tone: 'neutral', title: 'Netflix on Regalia', amount: 649 },
  { id: 'priya', date: '2026-10-23', label: 'Priya ₹12K', tone: 'info', title: 'Priya owes you', amount: 12000 },
  { id: 'regalia-bill', date: '2026-10-25', label: 'Regalia bill ₹44.3K', tone: 'warning', title: 'HDFC Regalia bill', amount: 44310, payable: true },
  { id: 'amex-stmt', date: '2026-10-27', label: 'Amex stmt expected', tone: 'neutral', title: 'Amex statement expected' },
  { id: 'rahul', date: '2026-10-28', label: 'Rahul +₹15K', tone: 'positive', title: 'Rahul pays you back', amount: 15000 },
  { id: 'home-emi-nov', date: '2026-11-05', label: 'Home EMI ₹36.6K', tone: 'neutral', title: 'HDFC Home Loan EMI', amount: 36620, payable: true },
  { id: 'amex-bill-nov', date: '2026-11-15', label: 'Amex bill', tone: 'neutral', title: 'Amex Platinum Travel bill' },
];

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const DAY_MS = 86_400_000;
const daysFromToday = (iso: string) => Math.round((Date.parse(iso) - Date.parse(TODAY)) / DAY_MS);
const whenText = (iso: string) => {
  const d = daysFromToday(iso);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return d > 0 ? `in ${d} days` : `${-d} days overdue`;
};
const shiftMonth = (monthIso: string, by: number) => {
  const [y, m] = monthIso.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const weekday = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });

const inCard: Decorator[] = [
  (Story) => (
    <Card className="max-w-sm p-0 overflow-hidden">
      <Story />
    </Card>
  ),
];

const meta: Meta<typeof MonthCalendar> = {
  title: 'DS/Data display/MonthCalendar',
  component: MonthCalendar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The month grid. Events mode is the Upcoming calendar: each day shows up to three chips coloured by status (red overdue, amber due soon, blue lending, green money in, grey scheduled), then "+N more". On phone the chips shrink to colour bars. Click a day to select it; the page shows that day\'s items below. Picker mode is the calendar inside DateField.',
      },
    },
  },
  args: {
    today: '2026-10-13',
    onValueChange: fn(),
    onMonthChange: fn(),
    onToday: fn(),
    onClear: fn(),
  },
  argTypes: {
    mode: { control: 'select', options: ['events', 'picker'] },
    range: { control: 'boolean' },
    borderTop: { control: 'boolean' },
    maxEventsPerDay: { control: { type: 'number', min: 1, max: 5 } },
    todayLabel: { control: 'text' },
    moreLabel: { control: false },
    today: { control: 'text' },
    month: { control: 'text' },
    defaultMonth: { control: 'text' },
    value: { control: 'object' },
    defaultValue: { control: false },
    minDate: { control: 'text' },
    maxDate: { control: 'text' },
    showFooter: { control: 'boolean' },
    events: { control: 'object' },
    weekdays: { table: { disable: true } },
  },
  render: function Render(args) {
    const [{ value, month }, updateArgs] = useArgs();
    return (
      <MonthCalendar
        {...args}
        value={value}
        month={month}
        onValueChange={(v) => {
          updateArgs({ value: v });
          args.onValueChange?.(v);
        }}
        onMonthChange={(m) => {
          updateArgs({ month: m });
          args.onMonthChange?.(m);
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof MonthCalendar>;

export const UpcomingCalendar: Story = {
  args: {
    mode: 'events',
    today: TODAY,
    month: '2026-10-01',
    value: '2026-10-15',
    events: upcoming,
    borderTop: false,
  },
  parameters: { layout: 'padded' },
  render: function Render(args) {
    const [{ value, month, events }, updateArgs] = useArgs();
    const items = (events ?? []) as UpcomingItem[];
    const inMonth = items.filter((it) => it.date.slice(0, 7) === month.slice(0, 7));
    const due = inMonth.filter((it) => it.payable).reduce((sum, it) => sum + (it.amount ?? 0), 0);
    const overdue = inMonth.filter((it) => it.tone === 'danger').length;
    const dayItems = items.filter((it) => it.date === value);
    const goToMonth = (m: string) => {
      updateArgs({ month: m });
      args.onMonthChange?.(m);
    };

    return (
      <div className="flex max-w-6xl flex-col gap-space-12">
        <div className="flex flex-col gap-space-12 desk:flex-row desk:items-center desk:justify-between">
          <Text variant="body" tone="ink-3">
            {formatMonth(month)} · {inr(due)} due · {overdue} overdue
          </Text>
          <div className="flex gap-space-8">
            <Button iconOnly aria-label="Previous month" onClick={() => goToMonth(shiftMonth(month, -1))}>
              <Icon name="chevron-left" />
            </Button>
            <Button
              className="flex-1 desk:flex-none"
              onClick={() => {
                updateArgs({ value: TODAY });
                goToMonth(`${TODAY.slice(0, 7)}-01`);
              }}
            >
              Today
            </Button>
            <Button iconOnly aria-label="Next month" onClick={() => goToMonth(shiftMonth(month, 1))}>
              <Icon name="chevron-right" />
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <MonthCalendar
            {...args}
            value={value}
            month={month}
            events={items}
            onValueChange={(v) => {
              updateArgs({ value: v });
              args.onValueChange?.(v);
            }}
            onMonthChange={goToMonth}
          />
        </Card>

        {typeof value === 'string' && (
          <Card className="p-0">
            <CardHeader
              title={`${weekday(value)} ${formatDate(value, 'list')}`}
              subtitle={dayItems.length ? 'Tap a day to see its items' : 'Nothing due on this day'}
            />
            {dayItems.map((it) => (
              <ListRow
                key={it.id}
                borderTop
                title={it.title}
                subtitle={whenText(it.date)}
                trailing={
                  <div className="flex items-center gap-space-12">
                    {it.amount !== undefined && (
                      <Text variant="body-strong">
                        {inr(it.amount)}
                      </Text>
                    )}
                    {it.payable && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateArgs({ events: items.filter((e) => e.id !== it.id) })}
                      >
                        Mark paid
                      </Button>
                    )}
                  </div>
                }
              />
            ))}
          </Card>
        )}
      </div>
    );
  },
};

export const Picker: Story = {
  decorators: inCard,
  args: {
    mode: 'picker',
    month: '2026-10-01',
    value: '2026-10-15',
  },
};

export const PickerRange: Story = {
  decorators: inCard,
  args: {
    mode: 'picker',
    range: true,
    month: '2026-10-01',
    value: { start: '2026-10-10', end: '2026-10-20' },
  },
};

export const PickerMinMax: Story = {
  decorators: inCard,
  args: {
    mode: 'picker',
    month: '2026-10-01',
    value: '2026-10-15',
    minDate: '2026-10-05',
    maxDate: '2026-10-25',
  },
};

export const PickerWithFooter: Story = {
  decorators: inCard,
  args: {
    mode: 'picker',
    month: '2026-10-01',
    value: '2026-10-15',
    showFooter: true,
  },
};

export const PickerYearRange: Story = {
  decorators: inCard,
  args: {
    mode: 'picker',
    month: '2026-10-01',
    value: '2026-10-15',
    minDate: '2024-03-10',
    maxDate: '2026-11-20',
  },
};

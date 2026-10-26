'use client';

import React from 'react';

import { Button, DateField, Icon, ListRow, Popover, Text } from '@/components/ds';
import { todayInAppZone } from '@/lib/date-range';
import { parseCalendarDate } from '@/lib/utils';

import { appTodayPlus, SNOOZE_PRESETS } from './inbox.helpers';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Wed 14 Oct": the hint beside each preset. */
export function snoozeHint(iso: string): string {
  const d = parseCalendarDate(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

interface InboxSnoozeMenuProps {
  /** The row's title, for the button's name. */
  title: string;
  onSnooze: (until: string) => void;
}

/**
 * Snooze presets (tomorrow, 3 days, next week) with their dates, then "Pick a date…", which turns
 * the same dropdown into a date field. Built from Popover and ListRow because Menu closes on every
 * pick and cannot host the date step.
 */
export function InboxSnoozeMenu({ title, onSnooze }: InboxSnoozeMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const [until, setUntil] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const tomorrow = appTodayPlus(1);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setPicking(false);
      setUntil('');
      setError(null);
    }
  };

  const snooze = (date: string) => {
    setOpen(false);
    onSnooze(date);
  };

  const submit = () => {
    if (!until) {
      setError('Pick a date');
      return;
    }
    if (until < tomorrow) {
      setError('Pick a date after today');
      return;
    }
    snooze(until);
  };

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      list
      align="end"
      trigger={
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={`Snooze ${title}`}
          icon={<Icon name="clock" size="sm" />}
        />
      }
    >
      {picking ? (
        <div className="flex flex-col gap-space-8 p-space-8">
          <DateField
            label="Snooze until"
            today={todayInAppZone()}
            minDate={tomorrow}
            value={until}
            onValueChange={(v) => {
              setUntil(typeof v === 'string' ? v : '');
              setError(null);
            }}
            helper="Must be after today."
            error={error ?? undefined}
          />
          <Button variant="primary" fullWidth onClick={submit}>
            Snooze
          </Button>
        </div>
      ) : (
        <>
          {SNOOZE_PRESETS.map((preset) => {
            const date = appTodayPlus(preset.days);
            return (
              <ListRow
                key={preset.label}
                clickable
                borderTop={false}
                title={preset.label}
                trailing={
                  <Text variant="caption" tone="ink-4">
                    {snoozeHint(date)}
                  </Text>
                }
                onClick={() => snooze(date)}
              />
            );
          })}
          <ListRow clickable title="Pick a date…" onClick={() => setPicking(true)} />
        </>
      )}
    </Popover>
  );
}

'use client';

import React from 'react';

import { Button, Card, Icon, ListRow, Select, Text } from '@/components/ds';
import type { NotificationSettingsResponse } from '@/lib/api/types';
import { notify } from '@/lib/notify';

import { KindSwitches, useSaveSettings } from './KindsCard';
import { BILLS_KINDS } from './notificationKinds';
import { hourLabel, OFFSET_CHOICES, offsetLabel, offsetsSummary, toggleOffset } from './notificationSettingsModel';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: hourLabel(h) }));

/** Bills & EMIs: days before due, the send hour, and the switches for their kinds. Every change saves at once. */
export function BillsCard({ settings }: { settings: NotificationSettingsResponse }) {
  const { save, pending } = useSaveSettings();
  const offsets = settings.reminderOffsets ?? [];
  const choices = [...new Set([...OFFSET_CHOICES, ...offsets])].sort((a, b) => b - a);
  const options = choices.map((o) => ({ value: String(o), label: offsetLabel(o) }));

  const changeOffsets = (picked: string | string[]) => {
    const next = (Array.isArray(picked) ? picked.map(Number) : []).sort((a, b) => b - a);
    // The picker toggles one value at a time; re-derive it against the saved list.
    const changed = choices.find((o) => next.includes(o) !== offsets.includes(o));
    const result = changed === undefined ? offsets : toggleOffset(offsets, changed);
    if (result.length === 0) {
      notify.error('Keep at least one reminder.');
      return;
    }
    void save({ reminderOffsets: result });
  };

  return (
    <Card title="Bills & EMIs">
      <ListRow
        title={<Text variant="body">Days before due</Text>}
        trailing={
          <Select
            multiple
            options={options}
            value={offsets.map(String)}
            onValueChange={changeOffsets}
            disabled={pending}
            trigger={
              <Button variant="secondary" size="sm" aria-label="Days before due" disabled={pending}>
                {offsetsSummary(offsets)}
                <Icon name="chevron-down" size="xs" />
              </Button>
            }
          />
        }
      />
      <ListRow
        wrap
        title={<Text variant="body">Send at</Text>}
        subtitle="IST · bill, EMI and money-due reminders go out from this hour"
        trailing={
          <Select
            options={HOUR_OPTIONS}
            value={String(settings.sendHour)}
            onValueChange={(v) => void save({ sendHour: Number(v) })}
            disabled={pending}
            trigger={
              <Button variant="secondary" size="sm" aria-label="Send at" disabled={pending}>
                {hourLabel(settings.sendHour)}
                <Icon name="chevron-down" size="xs" />
              </Button>
            }
          />
        }
      />
      <KindSwitches settings={settings} kinds={BILLS_KINDS} />
    </Card>
  );
}

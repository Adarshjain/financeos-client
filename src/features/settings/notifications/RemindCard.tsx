'use client';

import React from 'react';
import { toast } from 'sonner';

import { Button, Card, Icon, ListRow, Select, Text } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse, UpdateNotificationSettingsRequest } from '@/lib/api/types';

import { hourLabel, OFFSET_CHOICES, offsetLabel, offsetsSummary, toggleOffset } from './notificationSettings.helpers';
import { useNotificationSettingsMutations } from './useNotificationSettings';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: hourLabel(h) }));

/** Bills and EMIs: which days before the due date, and the hour pushes go out. Every change saves at once. */
export function RemindCard({ settings }: { settings: NotificationSettingsResponse }) {
  const { update } = useNotificationSettingsMutations();
  const offsets = settings.reminderOffsets ?? [];
  const choices = [...new Set([...OFFSET_CHOICES, ...offsets])].sort((a, b) => b - a);
  const options = choices.map((o) => ({ value: String(o), label: offsetLabel(o) }));

  const save = async (body: UpdateNotificationSettingsRequest) => {
    try {
      await update.mutateAsync(body);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save notification settings'));
    }
  };

  const changeOffsets = (picked: string | string[]) => {
    const next = (Array.isArray(picked) ? picked.map(Number) : []).sort((a, b) => b - a);
    // The picker toggles one value at a time; re-derive it against the saved list.
    const changed = choices.find((o) => next.includes(o) !== offsets.includes(o));
    const result = changed === undefined ? offsets : toggleOffset(offsets, changed);
    if (result.length === 0) {
      toast.error('Keep at least one reminder');
      return;
    }
    void save({ reminderOffsets: result });
  };

  return (
    <Card title="Remind me" subtitle="Bills and EMIs · every change saves immediately">
      <ListRow
        title={<Text variant="body">Days before due</Text>}
        trailing={
          <Select
            multiple
            options={options}
            value={offsets.map(String)}
            onValueChange={changeOffsets}
            disabled={update.isPending}
            trigger={
              <Button variant="secondary" size="sm" aria-label="Days before due" disabled={update.isPending}>
                {offsetsSummary(offsets)}
                <Icon name="chevron-down" size="xs" />
              </Button>
            }
          />
        }
      />
      <ListRow
        title={<Text variant="body">Send at</Text>}
        subtitle="IST · statement digests and mailbox alerts go out as soon as they happen"
        trailing={
          <Select
            options={HOUR_OPTIONS}
            value={String(settings.sendHour)}
            onValueChange={(v) => void save({ sendHour: Number(v) })}
            disabled={update.isPending}
            trigger={
              <Button variant="secondary" size="sm" aria-label="Send at" disabled={update.isPending}>
                {hourLabel(settings.sendHour)}
                <Icon name="chevron-down" size="xs" />
              </Button>
            }
          />
        }
      />
    </Card>
  );
}

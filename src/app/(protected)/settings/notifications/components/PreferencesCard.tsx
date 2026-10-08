'use client';

import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse, UpdateNotificationSettingsRequest } from '@/lib/api/types';
import { useNotificationSettingsMutations } from '@/lib/query/hooks/useNotificationSettings';

import { hourLabel, isKindEnabled, KIND_GROUPS, OFFSET_CHOICES, offsetLabel, toggleOffset } from './notificationSettings.helpers';

interface PreferencesCardProps {
  settings: NotificationSettingsResponse;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** What to send and when. Every change saves immediately. */
export function PreferencesCard({ settings }: PreferencesCardProps) {
  const { update } = useNotificationSettingsMutations();
  const offsets = settings.reminderOffsets ?? [];
  const extraOffsets = offsets.filter((o) => !OFFSET_CHOICES.includes(o));
  const choices = [...new Set([...OFFSET_CHOICES, ...extraOffsets])].sort((a, b) => b - a);

  const save = async (body: UpdateNotificationSettingsRequest) => {
    try {
      await update.mutateAsync(body);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save notification settings'));
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          What to send
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <Checkbox
            checked={settings.pushEnabled}
            disabled={update.isPending}
            onCheckedChange={(v) => save({ pushEnabled: v === true })}
            aria-label="Push notifications"
          />
          <span className="font-semibold">Push notifications</span>
          <span className="text-xs text-slate-500">(master switch for every device)</span>
        </label>

        {KIND_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5" data-testid={`kind-group-${group.title}`}>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{group.title}</p>
            <ul className="space-y-2">
              {group.kinds.map((kind) => (
                <li key={kind.key}>
                  <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <Checkbox
                      className="mt-0.5"
                      checked={isKindEnabled(settings, kind.key)}
                      disabled={update.isPending}
                      onCheckedChange={(v) => save({ kinds: { [kind.key]: v === true } })}
                      aria-label={kind.label}
                    />
                    <span>
                      <span className="font-semibold">{kind.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{kind.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Remind me (bills and EMIs)</p>
          <div className="flex flex-wrap gap-1.5" data-testid="reminder-offsets">
            {choices.map((offset) => {
              const active = offsets.includes(offset);
              return (
                <Button
                  key={offset}
                  size="pill"
                  variant={active ? 'filter-active' : 'filter'}
                  disabled={update.isPending}
                  aria-pressed={active}
                  onClick={() => {
                    const next = toggleOffset(offsets, offset);
                    if (next.length === 0) {
                      toast.error('Keep at least one reminder');
                      return;
                    }
                    void save({ reminderOffsets: next });
                  }}
                >
                  {offsetLabel(offset)}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Send from</p>
          <Select value={String(settings.sendHour)} onValueChange={(v) => save({ sendHour: Number(v) })}>
            <SelectTrigger className="h-8 w-36 text-xs rounded-lg" aria-label="Send hour">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)} className="text-xs">
                  {hourLabel(h)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-2xs text-slate-400">IST · statement digests and mailbox alerts go out as soon as they happen</span>
        </div>
      </CardContent>
    </Card>
  );
}

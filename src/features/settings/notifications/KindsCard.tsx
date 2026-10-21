'use client';

import React from 'react';
import { toast } from 'sonner';

import { Card } from '@/components/ds';
import { SettingsToggle } from '@/components/organisms';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse, UpdateNotificationSettingsRequest } from '@/lib/api/types';

import type { KindGroup, KindRow } from './notificationKinds';
import { isKindEnabled } from './notificationSettings.helpers';
import { useNotificationSettingsMutations } from './useNotificationSettings';

/** Saves a settings change at once, toasting a failure. Shared by every card on the page. */
export function useSaveSettings() {
  const { update } = useNotificationSettingsMutations();
  const save = async (body: UpdateNotificationSettingsRequest) => {
    try {
      await update.mutateAsync(body);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save notification settings'));
    }
  };
  return { save, pending: update.isPending };
}

/** One switch per kind; each saves on change and is disabled while a save is in flight. */
export function KindSwitches({ settings, kinds }: { settings: NotificationSettingsResponse; kinds: KindRow[] }) {
  const { save, pending } = useSaveSettings();
  return (
    <>
      {kinds.map((kind) => (
        <SettingsToggle
          // ListRow keeps a 4px left rail; match it so switches line up with the other rows.
          className="px-space-16 border-l-4 border-l-transparent"
          key={kind.key}
          label={kind.label}
          description={kind.description}
          checked={isKindEnabled(settings, kind.key)}
          disabled={pending}
          onCheckedChange={(v) => void save({ kinds: { [kind.key]: v } })}
        />
      ))}
    </>
  );
}

/** A card of kind switches; the card title is the group. */
export function KindsCard({ settings, group }: { settings: NotificationSettingsResponse; group: KindGroup }) {
  return (
    <Card title={group.title}>
      <KindSwitches settings={settings} kinds={group.kinds} />
    </Card>
  );
}

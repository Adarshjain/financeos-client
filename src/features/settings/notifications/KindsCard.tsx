'use client';

import React from 'react';

import { Card } from '@/components/ds';
import { SettingsToggle } from '@/components/organisms';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse, UpdateNotificationSettingsRequest } from '@/lib/api/types';
import { notify } from '@/lib/notify';

import type { KindGroup, KindRow } from './notificationKinds';
import { isKindEnabled } from './notificationSettingsModel';
import { useNotificationSettingsMutations } from './useNotificationSettings';

/** Saves a settings change at once, toasting a failure. Shared by every card on the page. */
export function useSaveSettings() {
  const { update } = useNotificationSettingsMutations();
  const save = async (body: UpdateNotificationSettingsRequest) => {
    try {
      await update.mutateAsync(body);
    } catch (e) {
      notify.error(getErrorMessage(e, "Couldn't save notification settings. Try again."));
    }
  };
  return { save, pending: update.isPending };
}

/** One switch per kind; each moves at once and saves in the background (a failure puts it back). */
export function KindSwitches({ settings, kinds }: { settings: NotificationSettingsResponse; kinds: KindRow[] }) {
  const { save } = useSaveSettings();
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

'use client';

import React from 'react';
import { toast } from 'sonner';

import { Card, CardSection } from '@/components/ds';
import { SettingsToggle } from '@/components/organisms';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse, UpdateNotificationSettingsRequest } from '@/lib/api/types';

import { KIND_BANDS } from './notificationKinds';
import { isKindEnabled } from './notificationSettings.helpers';
import { useNotificationSettingsMutations } from './useNotificationSettings';

/** The master switch and one switch per notification kind, grouped by module. Every change saves at once. */
export function KindsCard({ settings }: { settings: NotificationSettingsResponse }) {
  const { update } = useNotificationSettingsMutations();

  const save = async (body: UpdateNotificationSettingsRequest) => {
    try {
      await update.mutateAsync(body);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save notification settings'));
    }
  };

  return (
    <Card title="What to tell me about" subtitle="Grouped by module">
      <SettingsToggle
        className="px-space-16"
        label="Push notifications"
        description="Master switch for every device"
        checked={settings.pushEnabled}
        disabled={update.isPending}
        onCheckedChange={(v) => void save({ pushEnabled: v })}
      />
      {KIND_BANDS.map((band) => (
        <React.Fragment key={band.title}>
          <CardSection>{band.title}</CardSection>
          {band.kinds.map((kind) => (
            <SettingsToggle
              className="px-space-16"
              key={kind.key}
              label={kind.label}
              description={kind.description}
              checked={isKindEnabled(settings, kind.key)}
              disabled={update.isPending}
              onCheckedChange={(v) => void save({ kinds: { [kind.key]: v } })}
            />
          ))}
        </React.Fragment>
      ))}
    </Card>
  );
}

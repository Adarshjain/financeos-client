'use client';

import React from 'react';

import { Banner, Button, Card, CardEmpty, ListRow, Text } from '@/components/ds';
import { SettingsToggle } from '@/components/organisms';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse } from '@/lib/api/types';
import { notify } from '@/lib/notify';

import { useSaveSettings } from './KindsCard';
import { addedOn, describeBrowser } from './notificationSettings.helpers';
import { useNotificationSettingsMutations } from './useNotificationSettings';
import type { ThisBrowser } from './useThisBrowser';

interface DevicesProps {
  settings: NotificationSettingsResponse;
  browser: ThisBrowser;
}

/** One warning at a time, above the Devices card, saying why this browser cannot get pushes. */
export function PushWarning({ settings, browser }: DevicesProps) {
  const env = browser.env;
  if (!env) return null;
  if (!settings.pushConfigured) {
    return (
      <Banner tone="warning" title="Push isn't set up on the server">
        Bills still show on the dashboard. To get pushes, the server needs VAPID keys (PUSH_VAPID_PUBLIC_KEY / PUSH_VAPID_PRIVATE_KEY).
      </Banner>
    );
  }
  if (!env.supported) {
    return (
      <Banner tone="info" title="This browser can't receive push notifications">
        {env.iosNeedsInstall
          ? 'On iPhone and iPad, add FinanceOS to the Home Screen (Share → Add to Home Screen) and open it from there.'
          : 'Try a current Chrome, Edge, Firefox or Safari.'}
      </Banner>
    );
  }
  if (env.iosNeedsInstall) {
    return (
      <Banner tone="info" title="Add FinanceOS to the Home Screen">
        On iPhone, notifications only work from the Home Screen app. Add FinanceOS to the Home Screen first.
      </Banner>
    );
  }
  if (env.permission === 'denied') {
    return (
      <Banner tone="warning" title="Notifications are blocked">
        Notifications are blocked for this site. Allow them in the browser&apos;s site settings, then try again.
      </Banner>
    );
  }
  return null;
}

/** The master switch, then this browser and every other registered device. Removing a device needs no confirm. */
export function PushCard({ settings, browser }: DevicesProps) {
  const { unsubscribe, removeDevice } = useNotificationSettingsMutations();
  const { save, pending } = useSaveSettings();
  const devices = settings.devices ?? [];
  const env = browser.env;
  const others = devices.filter((d) => d.endpoint !== browser.endpoint);
  const thisDevice = devices.find((d) => d.endpoint === browser.endpoint);
  const canEnable = Boolean(env?.supported && settings.pushConfigured);
  const showTest = browser.registered;

  const remove = async (endpoint: string) => {
    try {
      await removeDevice.mutateAsync(endpoint);
      notify.success('Device removed');
    } catch (e) {
      notify.error(getErrorMessage(e, "Couldn't remove the device. Try again."));
    }
  };

  let status: string;
  if (browser.checking) status = 'Checking…';
  else if (browser.registered) {
    const added = addedOn(thisDevice?.addedAt);
    status = `${added ? `added ${added} · ` : ''}notifications are on here`;
  } else status = 'Not receiving notifications';

  return (
    <Card
      title="Push"
      subtitle="Pushes only. The bell always shows everything."
      action={
        showTest ? (
          <Button variant="link" size="sm" disabled={browser.testPending} onClick={browser.test}>
            Send a test
          </Button>
        ) : undefined
      }
    >
      <SettingsToggle
        // ListRow keeps a 4px left rail; match it so switches line up with the other rows.
        className="px-space-16 border-l-4 border-l-transparent"
        label="Push notifications"
        description="Master switch for every device"
        checked={settings.pushEnabled}
        disabled={pending}
        onCheckedChange={(v) => void save({ pushEnabled: v })}
      />
      <PushWarning settings={settings} browser={browser} />
      <ListRow
        title={<Text variant="body-strong">{`This browser · ${(env ? describeBrowser() : 'Browser')}`}</Text>}
        subtitle={status}
        trailing={
          browser.checking || !canEnable ? undefined : browser.registered ? (
            <Button variant="secondary" size="sm" disabled={browser.working} onClick={browser.disable}>
              Turn off here
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              loading={browser.working}
              disabled={env?.permission === 'denied'}
              onClick={browser.enable}
            >
              Turn on here
            </Button>
          )
        }
      />
      {devices.length === 0 ? <CardEmpty>No devices yet</CardEmpty> : null}
      {others.map((device) => (
        <ListRow
          key={device.endpoint}
          title={<Text variant="body-strong">{device.userAgent || 'Browser'}</Text>}
          subtitle={device.addedAt ? `added ${addedOn(device.addedAt)}` : undefined}
          trailing={
            <Button variant="secondary" size="sm" disabled={unsubscribe.isPending || removeDevice.isPending || browser.checking} onClick={() => void remove(device.endpoint)}>
              Remove
            </Button>
          }
        />
      ))}
    </Card>
  );
}

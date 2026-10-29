'use client';

import { useMutation } from '@tanstack/react-query';
import React from 'react';

import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse } from '@/lib/api/types';
import { formatCount } from '@/lib/format';
import { notify } from '@/lib/notify';

import {
  getCurrentPushSubscription,
  isIos,
  isPushSupported,
  isStandaloneDisplay,
  notificationPermission,
  type PermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from './push';
import { useNotificationSettingsMutations, usePushPublicKey } from './useNotificationSettings';

interface BrowserEnv {
  supported: boolean;
  permission: PermissionState;
  iosNeedsInstall: boolean;
}

/**
 * This browser's push state and its enable/disable flows. `env` is null until mounted, so the
 * server render and the first client render agree.
 */
export function useThisBrowser(settings: NotificationSettingsResponse) {
  const [env, setEnv] = React.useState<BrowserEnv | null>(null);
  const [endpoint, setEndpoint] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(true);
  const { subscribe, unsubscribe, sendTest } = useNotificationSettingsMutations();
  const { data: keyInfo } = usePushPublicKey(env?.supported ?? false);

  React.useEffect(() => {
    let cancelled = false;
    const supported = isPushSupported();
    const permission = notificationPermission();
    setEnv({ supported, permission, iosNeedsInstall: isIos() && !isStandaloneDisplay() });
    // A blocked or unsupported browser can never hold a subscription, and the service worker may never get ready there.
    if (!supported || permission === 'denied') {
      setChecking(false);
      return () => {
        cancelled = true;
      };
    }
    getCurrentPushSubscription()
      .then((sub) => {
        if (!cancelled) setEndpoint(sub?.endpoint ?? null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const devices = settings.devices ?? [];
  const registered = endpoint != null && devices.some((d) => d.endpoint === endpoint);

  const refreshPermission = () => setEnv((e) => e && { ...e, permission: notificationPermission() });

  const enableMutation = useMutation({
    mutationFn: async () => {
      const payload = await subscribeToPush(keyInfo?.publicKey ?? '');
      await subscribe.mutateAsync(payload);
      return payload;
    },
    onSuccess: (payload) => {
      setEndpoint(payload.endpoint);
      notify.success('Notifications enabled on this device');
    },
    onError: (e) => notify.error(getErrorMessage(e, "Couldn't enable notifications. Try again.")),
    onSettled: refreshPermission,
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const removed = await unsubscribeFromPush();
      if (removed ?? endpoint) {
        await unsubscribe.mutateAsync((removed ?? endpoint) as string);
      }
    },
    onSuccess: () => {
      setEndpoint(null);
      notify.success('Notifications disabled on this device');
    },
    onError: (e) => notify.error(getErrorMessage(e, "Couldn't disable notifications. Try again.")),
    onSettled: refreshPermission,
  });

  const working = enableMutation.isPending || disableMutation.isPending;
  const enable = () => enableMutation.mutate();
  const disable = () => disableMutation.mutate();

  const test = async () => {
    try {
      const result = await sendTest.mutateAsync();
      notify.success(result.sent > 0 ? `Test sent to ${formatCount(result.sent, ['device', 'devices'])}` : 'No device accepted the test');
    } catch (e) {
      notify.error(getErrorMessage(e, "Couldn't send a test. Try again."));
    }
  };

  return { env, endpoint, checking, working, registered, enable, disable, test, testPending: sendTest.isPending };
}

export type ThisBrowser = ReturnType<typeof useThisBrowser>;

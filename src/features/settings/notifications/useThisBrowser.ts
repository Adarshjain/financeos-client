'use client';

import React from 'react';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse } from '@/lib/api/types';

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
  const [working, setWorking] = React.useState(false);
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

  const enable = async () => {
    setWorking(true);
    try {
      const payload = await subscribeToPush(keyInfo?.publicKey ?? '');
      await subscribe.mutateAsync(payload);
      setEndpoint(payload.endpoint);
      toast.success('Notifications enabled on this device');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not enable notifications'));
    } finally {
      setWorking(false);
    }
  };

  const disable = async () => {
    setWorking(true);
    try {
      const removed = await unsubscribeFromPush();
      if (removed ?? endpoint) {
        await unsubscribe.mutateAsync((removed ?? endpoint) as string);
      }
      setEndpoint(null);
      toast.success('Notifications disabled on this device');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not disable notifications'));
    } finally {
      setWorking(false);
    }
  };

  const test = async () => {
    try {
      const result = await sendTest.mutateAsync();
      toast.success(result.sent > 0 ? `Test sent to ${result.sent} device${result.sent === 1 ? '' : 's'}` : 'No device accepted the test');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not send a test'));
    }
  };

  return { env, endpoint, checking, working, registered, enable, disable, test, testPending: sendTest.isPending };
}

export type ThisBrowser = ReturnType<typeof useThisBrowser>;

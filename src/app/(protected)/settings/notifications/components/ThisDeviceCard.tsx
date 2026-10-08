'use client';

import { BellOff, BellRing, Loader2, Send, Smartphone } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse } from '@/lib/api/types';
import {
  getCurrentPushSubscription,
  isIos,
  isPushSupported,
  isStandaloneDisplay,
  notificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';
import { useNotificationSettingsMutations, usePushPublicKey } from '@/lib/query/hooks/useNotificationSettings';

interface ThisDeviceCardProps {
  settings: NotificationSettingsResponse;
}

/** Register or remove this browser as a push target, plus a test send. */
export function ThisDeviceCard({ settings }: ThisDeviceCardProps) {
  const supported = isPushSupported();
  const { data: keyInfo } = usePushPublicKey(supported);
  const { subscribe, unsubscribe, sendTest } = useNotificationSettingsMutations();
  const [endpoint, setEndpoint] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
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

  const registered = endpoint != null && (settings.devices ?? []).some((d) => d.endpoint === endpoint);
  const permission = notificationPermission();
  const iosNeedsInstall = isIos() && !isStandaloneDisplay();

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

  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Smartphone className="h-4 w-4 text-slate-400" />
          This device
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {!settings.pushConfigured ? (
          <Alert variant="warning">
            <AlertTitle>Push isn&apos;t set up on the server</AlertTitle>
            <AlertDescription className="text-xs">
              Bills still show on the dashboard. To get pushes, the server needs VAPID keys
              (PUSH_VAPID_PUBLIC_KEY / PUSH_VAPID_PRIVATE_KEY).
            </AlertDescription>
          </Alert>
        ) : !supported ? (
          <Alert variant="info">
            <AlertTitle>This browser can&apos;t receive push notifications</AlertTitle>
            <AlertDescription className="text-xs">
              {iosNeedsInstall
                ? 'On iPhone and iPad, add FinanceOS to the Home Screen (Share → Add to Home Screen) and open it from there.'
                : 'Try a current Chrome, Edge, Firefox or Safari.'}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {iosNeedsInstall && (
              <Alert variant="info">
                <AlertDescription className="text-xs">
                  On iPhone, notifications only work from the Home Screen app. Add FinanceOS to the Home Screen first.
                </AlertDescription>
              </Alert>
            )}
            {permission === 'denied' && (
              <Alert variant="warning">
                <AlertDescription className="text-xs">
                  Notifications are blocked for this site. Allow them in the browser&apos;s site settings, then try again.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {checking ? (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
                </span>
              ) : registered ? (
                <>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <BellRing className="h-3.5 w-3.5" /> Notifications are on for this device
                  </span>
                  <Button size="sm" variant="outline" disabled={working} onClick={disable}>
                    <BellOff className="h-4 w-4" />
                    Turn off here
                  </Button>
                  <Button size="sm" variant="ghost" disabled={sendTest.isPending} onClick={test}>
                    <Send className="h-4 w-4" />
                    Send a test
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="primary" disabled={working || permission === 'denied'} onClick={enable}>
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                  Enable on this device
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

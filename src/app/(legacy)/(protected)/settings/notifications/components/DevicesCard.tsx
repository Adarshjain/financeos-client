'use client';

import { MonitorSmartphone, Trash2 } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NotificationSettingsResponse } from '@/lib/api/types';
import { getCurrentPushSubscription, unsubscribeFromPush } from '@/lib/push';
import { useNotificationSettingsMutations } from '@/lib/query/hooks/useNotificationSettings';
import { formatDate } from '@/lib/utils';

import { isThisDevice } from './notificationSettings.helpers';

interface DevicesCardProps {
  settings: NotificationSettingsResponse;
}

/** Every registered browser; removing the current one also drops the browser-side subscription. */
export function DevicesCard({ settings }: DevicesCardProps) {
  const { unsubscribe } = useNotificationSettingsMutations();
  const [currentEndpoint, setCurrentEndpoint] = React.useState<string | null>(null);
  const devices = settings.devices ?? [];

  React.useEffect(() => {
    let cancelled = false;
    getCurrentPushSubscription().then((sub) => {
      if (!cancelled) setCurrentEndpoint(sub?.endpoint ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [devices.length]);

  const remove = async (endpoint: string) => {
    try {
      if (isThisDevice(endpoint, currentEndpoint)) {
        await unsubscribeFromPush();
        setCurrentEndpoint(null);
      }
      await unsubscribe.mutateAsync(endpoint);
      toast.success('Device removed');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not remove the device'));
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <MonitorSmartphone className="h-4 w-4 text-slate-400" />
          Devices
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {devices.length === 0 ? (
          <p className="text-xs text-slate-500">No device is registered yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-testid="devices">
            {devices.map((device) => (
              <li key={device.endpoint} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-200 truncate">
                    {device.userAgent || 'Browser'}
                    {isThisDevice(device.endpoint, currentEndpoint) && (
                      <span className="ml-2 text-2xs font-semibold text-emerald-600 dark:text-emerald-400">this device</span>
                    )}
                  </p>
                  {device.addedAt && <p className="text-2xs text-slate-400">added {formatDate(device.addedAt)}</p>}
                </div>
                <Button
                  size="icon-xs"
                  variant="ghost-destructive"
                  aria-label={`Remove ${device.userAgent || 'device'}`}
                  disabled={unsubscribe.isPending}
                  onClick={() => remove(device.endpoint)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

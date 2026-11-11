'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { formatDateTime } from '@/lib/format';
import type { SmsDevice } from '@/lib/sms.types';

import { disconnectDevice, pauseDevice, resumeDevice } from './smsActions';
import { SmsCardHeader } from './SmsCardHeader';
import { dmy } from './smsModel';
import { useSmsRun } from './useSmsRun';

function lastSyncText(device: SmsDevice): string {
  const at = device.lastSummaryAt ?? device.lastSeenAt;
  return at ? `Last sync ${formatDateTime(at)}` : 'Not synced yet';
}

/** The phone card: how to connect a phone, or list the connected phones with Pause / Resume and Disconnect. */
export function PhoneCard({ devices }: { devices: readonly SmsDevice[] }) {
  const connected = devices.filter((d) => !d.revokedAt);
  const { run } = useSmsRun();
  const [disconnecting, setDisconnecting] = React.useState<SmsDevice | null>(null);
  const [busy, setBusy] = React.useState(false);

  const toggle = async (device: SmsDevice) => {
    await run(() => (device.paused ? resumeDevice(device.id) : pauseDevice(device.id)));
  };

  const confirmDisconnect = async () => {
    if (!disconnecting) return;
    setBusy(true);
    try {
      const result = await run(() => disconnectDevice(disconnecting.id));
      if (result.success) {
        showToast(`Disconnected ${disconnecting.name}`);
        setDisconnecting(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card data-testid="sms-phone">
      <SmsCardHeader title="Phone" subtitle="The phone that sends your bank and wallet messages" />
      {connected.length === 0 ? (
        <Card.Empty>
          <Text variant="body" tone="ink-3" as="p">
            Install the FinanceOS SMS sync app on your Android phone.
          </Text>
          <Text variant="body" tone="ink-3" as="p">
            Sign in there with the email and password or the Google account you use here. The phone then shows up in this list.
          </Text>
          <Text variant="body" tone="ink-3" as="p">
            Nothing is read until you turn an account on below.
          </Text>
        </Card.Empty>
      ) : (
        <>
          {connected.map((device) => (
          <ListRow
            key={device.id}
            wrap
            data-testid="sms-device"
            title={device.name}
            subtitle={
              <>
                <span className="block">Connected {dmy(device.pairedAt)}</span>
                <span className="block">{device.paused ? `${lastSyncText(device)}. Paused` : lastSyncText(device)}</span>
              </>
            }
            actions={[
              { id: 'toggle', label: device.paused ? 'Resume' : 'Pause', onSelect: () => void toggle(device) },
              { id: 'disconnect', label: 'Disconnect', tone: 'danger', onSelect: () => setDisconnecting(device) },
            ]}
          />
          ))}
          <Card.Footer>To add another phone, sign in to the app on it.</Card.Footer>
        </>
      )}

      <ConfirmDialog
        open={disconnecting !== null}
        onOpenChange={(next) => {
          if (!next && !busy) setDisconnecting(null);
        }}
        title="Disconnect this phone?"
        description={`${disconnecting?.name ?? 'This phone'} stops sending messages. Messages already stored and transactions already added stay. You can connect it again by signing in on it.`}
        confirmLabel="Disconnect"
        confirmLoading={busy}
        onConfirm={() => void confirmDisconnect()}
      />
    </Card>
  );
}

'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog, Dialog } from '@/components/ds/Dialog/Dialog';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { formatDateTime, formatTime } from '@/lib/format';
import type { SmsDevice, SmsPairingCode } from '@/lib/sms.types';

import { createPairingCode, disconnectDevice, pauseDevice, resumeDevice } from './smsActions';
import { SmsCardHeader } from './SmsCardHeader';
import { dmy } from './smsModel';
import { useSmsRun } from './useSmsRun';

interface PairingShown extends SmsPairingCode {
  address: string;
}

function lastSyncText(device: SmsDevice): string {
  const at = device.lastSummaryAt ?? device.lastSeenAt;
  return at ? `Last sync ${formatDateTime(at)}` : 'Not synced yet';
}

/** The phone card: pair a phone with a code, or list the connected phones with Pause / Resume and Disconnect. */
export function PhoneCard({ devices }: { devices: readonly SmsDevice[] }) {
  const connected = devices.filter((d) => !d.revokedAt);
  const { run, refresh } = useSmsRun();
  const [pairing, setPairing] = React.useState<PairingShown | null>(null);
  const [asking, setAsking] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState<SmsDevice | null>(null);
  const [busy, setBusy] = React.useState(false);

  const connect = async () => {
    setAsking(true);
    try {
      const result = await run(() => createPairingCode(), { refresh: false });
      if (result.success) setPairing({ ...result.data, address: window.location.origin });
    } finally {
      setAsking(false);
    }
  };

  // A phone may have paired while the dialog was open.
  const closePairing = () => {
    setPairing(null);
    refresh();
  };

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
            Connect a phone to read your bank and wallet messages. Nothing is read until you turn an account on below.
          </Text>
          <Button variant="primary" size="md" loading={asking} onClick={() => void connect()}>
            Connect a phone
          </Button>
        </Card.Empty>
      ) : (
        connected.map((device) => (
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
        ))
      )}

      {pairing ? (
        <Dialog open onOpenChange={(open) => (open ? undefined : closePairing())}>
          <Dialog.Content size="sm" title="Connect a phone" description={`This code works once and expires at ${formatTime(pairing.expiresAt)}.`} primary={{ label: 'Done', onSelect: closePairing }}>
            <Dialog.Body>
              <div className="flex flex-col gap-space-12">
                <Text variant="figure" as="p" mono data-testid="sms-pairing-code">
                  {pairing.code}
                </Text>
                <Text variant="body" as="p">
                  1. Install the FinanceOS SMS app on your Android phone.
                </Text>
                <Text variant="body" as="p">
                  2. Enter this address and the code: {pairing.address}
                </Text>
                <Text variant="body" as="p">
                  3. Allow SMS access when the app asks.
                </Text>
              </div>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={disconnecting !== null}
        onOpenChange={(next) => {
          if (!next && !busy) setDisconnecting(null);
        }}
        title="Disconnect this phone?"
        description={`${disconnecting?.name ?? 'This phone'} stops sending messages. Messages already stored and transactions already added stay. You can connect it again with a new code.`}
        confirmLabel="Disconnect"
        confirmLoading={busy}
        onConfirm={() => void confirmDisconnect()}
      />
    </Card>
  );
}

'use client';

import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { DateField } from '@/components/ds/DateField/DateField';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Switch } from '@/components/ds/Switch/Switch';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { DialogFrame, useDialogSubmit } from '@/features/accounts/detail/cards/DialogFrame';
import type { SmsAccountLines } from '@/lib/sms.types';

import { turnLineOff, turnLineOn } from './smsActions';
import { accountIsOn, defaultSyncFrom, feedText, linesToTurnOn, messagesText, notSyncedText, sendersText, sortAccounts } from './smsModel';
import { useSmsRun } from './useSmsRun';

/** "Sync from": the date the backfill starts, then every line of the account that is not on is turned on from it. */
function SyncFromDialog({ account, today, onClose, onDone }: { account: SmsAccountLines; today: string; onClose: () => void; onDone: () => void }) {
  const [from, setFrom] = React.useState(() => defaultSyncFrom(account));
  const { pending, error, submit } = useDialogSubmit(onClose);

  const handle = () => {
    void submit(async () => {
      const turnedOn: string[] = [];
      for (const line of linesToTurnOn(account)) {
        const result = await turnLineOn(line.id, account.accountId, from);
        if (!result.success) {
          // Put back what this click already turned on, then close: the dialog's view of the account is stale.
          await Promise.all(turnedOn.map((id) => turnLineOff(id)));
          showToast(result.error.message, { tone: 'danger' });
          onDone();
          return null;
        }
        turnedOn.push(line.id);
      }
      onDone();
      return null;
    });
  };

  return (
    <DialogFrame
      title={`Turn on SMS sync for ${account.name}`}
      description="Messages from this date on are read. Nothing earlier leaves the phone."
      submitLabel="Turn on"
      onSubmit={handle}
      onClose={onClose}
      loading={pending}
      error={error}
      submitDisabled={!from}
    >
      <DateField label="Sync from" today={today} value={from} onValueChange={(v) => setFrom(typeof v === 'string' ? v : '')} />
    </DialogFrame>
  );
}

/** One row per account that has SMS lines: what feeds it today and a switch for all its lines. */
export function AccountsCard({ accounts, today }: { accounts: readonly SmsAccountLines[]; today: string }) {
  const rows = React.useMemo(() => sortAccounts(accounts), [accounts]);
  const { run, refresh } = useSmsRun();
  const [turningOn, setTurningOn] = React.useState<SmsAccountLines | null>(null);
  const [offId, setOffId] = React.useState<string | null>(null);

  const turnOff = async (account: SmsAccountLines) => {
    setOffId(account.accountId);
    try {
      for (const line of account.lines.filter((l) => l.state === 'ON')) {
        const result = await run(() => turnLineOff(line.id), { refresh: false });
        if (!result.success) break;
      }
    } finally {
      setOffId(null);
      refresh();
    }
  };

  return (
    <Card data-testid="sms-accounts" title="Your accounts" subtitle="Turn an account on to read its messages. Everything is off until you do.">
      {rows.length === 0 ? (
        <Card.Empty>No messages from your accounts yet</Card.Empty>
      ) : (
        rows.map((account) => (
          <ListRow
            key={account.accountId}
            wrap
            data-testid="sms-account-row"
            title={
              <span className="flex flex-wrap items-center gap-space-8">
                <span>{account.name}</span>
                {account.lines.some((l) => l.isNew) ? (
                  <Badge tone="info" size="sm">
                    New
                  </Badge>
                ) : null}
              </span>
            }
            subtitle={
              <>
                <span className="block">{sendersText(account.lines)}</span>
                <span className="block">{messagesText(account.lines)}</span>
                <span className="block">{feedText(account.last60Days)}</span>
                {accountIsOn(account) && notSyncedText(account) ? (
                  <span className="block">
                    {notSyncedText(account)}{' '}
                    <Text variant="label" as="span">
                      <Button variant="link" size="sm" onClick={() => setTurningOn(account)}>
                        Turn on
                      </Button>
                    </Text>
                  </span>
                ) : null}
              </>
            }
            trailing={
              <Switch
                aria-label={`SMS sync for ${account.name}`}
                checked={accountIsOn(account)}
                disabled={offId === account.accountId}
                onCheckedChange={(on) => (on ? setTurningOn(account) : void turnOff(account))}
              />
            }
          />
        ))
      )}
      {turningOn ? <SyncFromDialog account={turningOn} today={today} onClose={() => setTurningOn(null)} onDone={refresh} /> : null}
    </Card>
  );
}

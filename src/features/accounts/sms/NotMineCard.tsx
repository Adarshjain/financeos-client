'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { ClosedToggleButton } from '@/features/accounts/list/AccountsSections';
import type { SmsLine } from '@/lib/sms.types';

import { undoLineNotMine } from './smsActions';
import { lineText } from './smsModel';
import { useSmsRun } from './useSmsRun';

/** Lines marked "Not mine": collapsed by default, each with Undo. Hidden when there are none. */
export function NotMineCard({ lines }: { lines: readonly SmsLine[] }) {
  const { run } = useSmsRun();
  const [showing, setShowing] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  if (lines.length === 0) return null;

  const undo = async (line: SmsLine) => {
    setBusyId(line.id);
    try {
      await run(() => undoLineNotMine(line.id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card data-testid="sms-not-mine" title="Not mine" subtitle={`${lines.length} hidden`} action={<ClosedToggleButton showing={showing} onToggle={() => setShowing((v) => !v)} />}>
      {showing
        ? lines.map((line) => (
            <ListRow
              key={line.id}
              wrap
              data-testid="sms-not-mine-row"
              title={line.provider}
              subtitle={lineText(line)}
              trailing={
                <Text variant="label" as="span">
                  <Button variant="link" size="sm" loading={busyId === line.id} onClick={() => void undo(line)}>
                    Undo
                  </Button>
                </Text>
              }
            />
          ))
        : null}
    </Card>
  );
}

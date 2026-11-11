'use client';

import React from 'react';

import { LoadError } from '@/features/shell/LoadError';

import { AccountsCard } from './AccountsCard';
import { MessagesCard } from './MessagesCard';
import { NotMineCard } from './NotMineCard';
import { PhoneCard } from './PhoneCard';
import { ReportCard } from './ReportCard';
import { markLinesSeen } from './smsActions';
import type { SmsPageData } from './smsData';
import { reportVisible } from './smsModel';
import { UnassignedCard } from './UnassignedCard';

/** The SMS sync page body. The data arrives from the server render; the "New" marks are cleared once, after it shows. */
export function SmsSyncScreen({ data, today }: { data: SmsPageData; today: string }) {
  const seen = React.useRef(false);
  React.useEffect(() => {
    if (seen.current || !data.lines.ok) return;
    seen.current = true;
    void markLinesSeen();
  }, [data.lines.ok]);

  const { devices, lines, report, needsCheck, couldNotRead, accounts } = data;
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {devices.ok ? <PhoneCard devices={devices.data} /> : <LoadError what="your phone" reference={devices.reference} />}
      {lines.ok ? (
        <>
          <AccountsCard accounts={lines.data.accounts} today={today} />
          <UnassignedCard lines={lines.data.unassigned} accounts={accounts} />
          <NotMineCard lines={lines.data.notMine} />
        </>
      ) : (
        <LoadError what="SMS accounts" reference={lines.reference} />
      )}
      {reportVisible(report) ? <ReportCard report={report} /> : null}
      {needsCheck && needsCheck.total > 0 ? (
        <MessagesCard status="NEEDS_CONFIRM" title="Needs your check" subtitle="Read, but not sure enough to add" initial={needsCheck} />
      ) : null}
      {couldNotRead && couldNotRead.total > 0 ? (
        <MessagesCard status="COULD_NOT_READ" title="Couldn't read" subtitle="Messages that look like a transaction but could not be read" initial={couldNotRead} />
      ) : null}
    </div>
  );
}

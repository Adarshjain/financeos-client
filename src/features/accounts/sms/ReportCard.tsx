import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import type { SmsReport } from '@/lib/sms.types';

import { reportCounts } from './smsModel';

/** What the stored messages would do (or did) to each account. Shown only once something is stored. */
export function ReportCard({ report }: { report: SmsReport }) {
  return (
    <Card
      data-testid="sms-report"
      title="What would happen"
      subtitle={report.postingEnabled ? undefined : 'Nothing is added to your accounts yet. This shows what would be added once it is turned on.'}
    >
      {report.accounts.map((account) => (
        <ListRow
          key={account.accountId}
          wrap
          data-testid="sms-report-row"
          title={account.name}
          subtitle={
            <>
              <span className="block">{reportCounts(account, report.postingEnabled)}</span>
              {account.alerts.map((alert, i) => (
                <span key={`${alert.kind}-${i}`} className="block">
                  {alert.message}
                </span>
              ))}
            </>
          }
        />
      ))}
    </Card>
  );
}

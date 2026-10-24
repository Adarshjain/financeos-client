import React from 'react';

import { REPORTS_HREF } from '@/features/reports/list/reportsList';
import { PageNotFound } from '@/features/shell/PageNotFound';

export default function DsReportNotFound() {
  return (
    <PageNotFound
      what="Report"
      description="It may have been deleted."
      backPath="/reports"
      backLabel="Go to Reports"
      shell={{ crumb: 'Insights / Reports', title: 'Report', backHref: REPORTS_HREF }}
    />
  );
}

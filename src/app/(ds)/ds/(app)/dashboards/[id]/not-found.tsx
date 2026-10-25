import React from 'react';

import { DASHBOARDS_CRUMB, DASHBOARDS_HREF } from '@/features/dashboards/routes';
import { PageNotFound } from '@/features/shell/PageNotFound';

export default function DsDashboardNotFound() {
  return (
    <PageNotFound
      what="Dashboard"
      description="It may have been deleted."
      backPath="/dashboards"
      backLabel="Go to Dashboards"
      shell={{ crumb: DASHBOARDS_CRUMB, title: 'Dashboard', backHref: DASHBOARDS_HREF }}
    />
  );
}

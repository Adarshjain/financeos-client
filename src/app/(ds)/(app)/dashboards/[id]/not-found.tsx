'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaNotFound({
  what: 'Dashboard',
  crumb: subCrumb('dashboards'),
  title: 'Dashboard',
  backHref: crumbMap.dashboards.href,
  backLabel: 'Back to dashboards',
});

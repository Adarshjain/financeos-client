'use client';

import { areaError } from '@/features/shell/areaError';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaError({
  what: 'this dashboard',
  crumb: subCrumb('dashboards'),
  title: 'Dashboard',
  backHref: crumbMap.dashboards.href,
});

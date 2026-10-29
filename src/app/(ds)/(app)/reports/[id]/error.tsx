'use client';

import { areaError } from '@/features/shell/areaError';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaError({
  what: 'this report',
  crumb: subCrumb('reports'),
  title: 'Report',
  backHref: crumbMap.reports.href,
});

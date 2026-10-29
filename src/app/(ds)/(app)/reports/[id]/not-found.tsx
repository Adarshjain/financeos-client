'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaNotFound({
  what: 'Report',
  crumb: subCrumb('reports'),
  title: 'Report',
  backHref: crumbMap.reports.href,
  backLabel: 'Back to reports',
});

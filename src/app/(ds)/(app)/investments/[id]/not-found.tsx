'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaNotFound({
  what: 'Holding',
  crumb: subCrumb('investments'),
  title: 'Holding',
  backHref: crumbMap.investments.href,
  backLabel: 'Back to investments',
});

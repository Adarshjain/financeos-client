'use client';

import { areaError } from '@/features/shell/areaError';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaError({
  what: 'this holding',
  crumb: subCrumb('investments'),
  title: 'Holding',
  backHref: crumbMap.investments.href,
});

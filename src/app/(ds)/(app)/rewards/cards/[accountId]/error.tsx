'use client';

import { areaError } from '@/features/shell/areaError';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaError({
  what: 'this card',
  crumb: subCrumb('rewards'),
  title: crumbMap.rewards.label,
  backHref: crumbMap.rewards.href,
});

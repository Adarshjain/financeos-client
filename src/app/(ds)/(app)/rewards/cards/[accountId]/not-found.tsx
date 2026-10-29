'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaNotFound({
  what: 'Card',
  crumb: subCrumb('rewards'),
  title: crumbMap.rewards.label,
  backHref: crumbMap.rewards.href,
  backLabel: 'Back to rewards',
});

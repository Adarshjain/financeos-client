'use client';

import { areaError } from '@/features/shell/areaError';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaError({
  what: 'this person',
  crumb: subCrumb('lendings'),
  title: 'Person',
  backHref: crumbMap.lendings.href,
});

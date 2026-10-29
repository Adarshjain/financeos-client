'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaNotFound({
  what: 'Person',
  crumb: subCrumb('lendings'),
  title: 'Person',
  backHref: crumbMap.lendings.href,
  backLabel: 'Back to lendings',
});

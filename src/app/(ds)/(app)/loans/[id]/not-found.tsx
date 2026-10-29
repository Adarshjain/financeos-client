'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaNotFound({
  what: 'Loan',
  crumb: subCrumb('loans'),
  title: 'Loan',
  backHref: crumbMap.loans.href,
  backLabel: 'Back to loans',
});

'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaNotFound({
  what: 'Loan',
  crumb: subCrumb('accounts', 'Loans'),
  title: 'Loan',
  backHref: crumbMap.accounts.href,
  backLabel: 'Back to accounts',
});

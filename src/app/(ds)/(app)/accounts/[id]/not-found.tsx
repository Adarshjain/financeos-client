'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { areaCrumb, crumbMap } from '@/features/shell/navigation';

export default areaNotFound({
  what: 'Account',
  crumb: areaCrumb('accounts'),
  title: crumbMap.accounts.label,
  backHref: crumbMap.accounts.href,
  backLabel: 'Back to accounts',
  framed: true,
});

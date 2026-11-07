'use client';

import { areaError } from '@/features/shell/areaError';
import { crumbMap, subCrumb } from '@/features/shell/navigation';

export default areaError({ what: 'this loan', crumb: subCrumb('accounts', 'Loans'), title: 'Loan', backHref: crumbMap.accounts.href });

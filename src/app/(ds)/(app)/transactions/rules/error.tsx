'use client';

import { areaError } from '@/features/shell/areaError';
import { subCrumb } from '@/features/shell/navigation';

export default areaError({ what: 'rules', crumb: subCrumb('transactions'), title: 'Rules' });

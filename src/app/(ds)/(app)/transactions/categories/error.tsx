'use client';

import { areaError } from '@/features/shell/areaError';
import { subCrumb } from '@/features/shell/navigation';

export default areaError({ what: 'categories', crumb: subCrumb('transactions'), title: 'Categories' });

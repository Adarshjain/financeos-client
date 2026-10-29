'use client';

import { areaError } from '@/features/shell/areaError';
import { areaCrumb } from '@/features/shell/navigation';

export default areaError({ what: 'categories', crumb: areaCrumb('transactions'), title: 'Categories' });

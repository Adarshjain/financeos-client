'use client';

import { areaError } from '@/features/shell/areaError';
import { areaCrumb } from '@/features/shell/navigation';

export default areaError({ what: 'transactions', crumb: areaCrumb('transactions'), title: 'Transactions' });

'use client';

import { areaError } from '@/features/shell/areaError';
import { areaCrumb, crumbMap } from '@/features/shell/navigation';

export default areaError({ what: 'Home', crumb: areaCrumb('home'), title: crumbMap.home.label });

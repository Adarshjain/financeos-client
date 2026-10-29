'use client';

import { areaError } from '@/features/shell/areaError';
import { areaCrumb, crumbMap } from '@/features/shell/navigation';

export default areaError({
  what: 'this chat',
  crumb: areaCrumb('chat'),
  title: crumbMap.chat.label,
  backHref: crumbMap.reports.href,
});

'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { areaCrumb, crumbMap } from '@/features/shell/navigation';

export default areaNotFound({
  what: 'Chat',
  crumb: areaCrumb('chat'),
  title: crumbMap.chat.label,
  backHref: crumbMap.chat.href,
  backLabel: 'Back to Ask the data',
});

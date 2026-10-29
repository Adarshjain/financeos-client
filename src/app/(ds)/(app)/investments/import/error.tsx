'use client';

import { TRADEBOOK_HREF } from '@/features/investments/tradebook/tradebookModel';
import { areaError } from '@/features/shell/areaError';
import { subCrumb } from '@/features/shell/navigation';

/** The tradebook import renders without the Investments tabs, so it keeps its own app bar. */
export default areaError({
  what: 'the import',
  crumb: subCrumb('investments'),
  title: 'Import tradebook',
  backHref: TRADEBOOK_HREF,
});

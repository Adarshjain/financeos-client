'use client';

import { areaNotFound } from '@/features/shell/areaNotFound';
import { subCrumb } from '@/features/shell/navigation';
import { IMPORT_HREF } from '@/features/transactions/import/importModel';

export default areaNotFound({
  what: 'Import',
  crumb: subCrumb('transactions', 'Import'),
  title: 'Import result',
  backHref: IMPORT_HREF,
  backLabel: 'Back to import',
});

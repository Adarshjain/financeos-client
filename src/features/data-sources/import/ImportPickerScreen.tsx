import Link from 'next/link';
import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { IMPORT_BACK_HREF, importKindRows } from './importPickerModel';

/** /import: the kinds of file you can import, one row each, leading to the page that takes it. */
export function ImportPickerScreen() {
  return (
    <ShellPage title="Import a file" crumb={subCrumb('dataSources')} backHref={IMPORT_BACK_HREF}>
      <div className="w-full max-w-container-lg mx-auto">
        <Card>
          {importKindRows.map((row) => (
            <ListRow key={row.id} asChild borderTop chevron title={row.title} subtitle={row.subtitle}>
              <Link href={row.href} prefetch={false} />
            </ListRow>
          ))}
        </Card>
      </div>
    </ShellPage>
  );
}

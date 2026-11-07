import React from 'react';

import { DataSourcesShell } from '@/features/data-sources/DataSourcesShell';

export default function DsDataSourcesLayout({ children }: { children: React.ReactNode }) {
  return <DataSourcesShell>{children}</DataSourcesShell>;
}

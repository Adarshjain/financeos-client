import React from 'react';

import { DataSourcesMain } from '@/features/data-sources/DataSourcesMain';
import { gmailApi } from '@/lib/apiClient';

export const metadata = { title: 'Data sources' };

export default function DsDataSourcesPage() {
  // The attention count streams in on its own and a failed request only hides it.
  const attentionCount = gmailApi
    .getAttentionItems(0, 1, false)
    .then((a) => a.totalElements)
    .catch(() => undefined);
  return <DataSourcesMain values={{ attentionCount }} />;
}

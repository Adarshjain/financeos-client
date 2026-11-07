import { redirect } from 'next/navigation';
import React from 'react';

import { importsUrl, parseImportsUrl } from '@/features/data-sources/imports/importsModel';
import { ImportsScreen } from '@/features/data-sources/imports/ImportsScreen';
import { guardSession } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';
import type { SearchParams } from '@/features/shell/searchParams';
import { importsApi } from '@/lib/apiClient';

export const metadata = { title: 'Imports' };

/** /data-sources/imports: the page and kind come from the address, so the list is read once, here. */
export default async function DsDataSourcesImportsPage({ searchParams }: { searchParams: SearchParams }) {
  const { page, size, kind } = parseImportsUrl(await searchParams);
  const list = await guardSession(importsApi.list({ page, size, kind: kind || undefined }));
  const totalPages = list.totalPages ?? 0;
  // A page past the last one (imports aged out): go to the last page instead.
  if (page > 0 && list.content.length === 0 && totalPages > 0 && page >= totalPages) {
    redirect(importsUrl({ kind, size }, clampPage(page, totalPages)));
  }
  return <ImportsScreen rows={list.content} totalElements={list.totalElements} totalPages={totalPages} page={page} size={size} kind={kind} />;
}

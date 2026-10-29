import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import React from 'react';

import { loadDashboardPage } from '@/features/dashboards/dashboardData';
import { DashboardScreen } from '@/features/dashboards/view/DashboardScreen';
import { parseDashboardUrl } from '@/features/dashboards/view/dashboardUrl';
import type { SearchParams } from '@/features/shell/searchParams';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { dashboard } = await loadDashboardPage((await params).id);
  return { title: dashboard?.name ?? 'Dashboard' };
}

/** /dashboards/[id]: a dashboard to view, and to edit on the same page (`?edit=1` opens it editing; read here so the first render has it). */
export default async function DsDashboardPage({ params, searchParams }: Params & { searchParams: SearchParams }) {
  const { id } = await params;
  const { startEditing } = parseDashboardUrl(await searchParams);
  const { dashboard, state } = await loadDashboardPage(id);
  return (
    <HydrationBoundary state={state}>
      <DashboardScreen key={id} dashboard={dashboard} startEditing={startEditing} />
    </HydrationBoundary>
  );
}

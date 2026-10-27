import { HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { loadDashboardPage } from '@/features/dashboards/dashboardData';
import { DashboardScreen } from '@/features/dashboards/view/DashboardScreen';

/** /dashboards/[id]: a dashboard to view, and to edit on the same page (`?edit=1` opens it editing; read here so the first render has it). */
export default async function DsDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const { dashboard, state } = await loadDashboardPage(id);
  return (
    <HydrationBoundary state={state}>
      <DashboardScreen key={id} dashboard={dashboard} startEditing={(Array.isArray(edit) ? edit[0] : edit) === '1'} />
    </HydrationBoundary>
  );
}

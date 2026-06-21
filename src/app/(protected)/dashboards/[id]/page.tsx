import { DashboardEditor } from '@/components/dashboards/DashboardEditor';
import { dashboardsApi, reportsApi } from '@/lib/apiClient';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dashboard, reports] = await Promise.all([
    dashboardsApi.getById(id),
    reportsApi.list(),
  ]);

  return (
    <DashboardEditor mode="edit" dashboard={dashboard} reports={reports} />
  );
}

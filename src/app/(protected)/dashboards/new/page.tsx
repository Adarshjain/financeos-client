import { DashboardEditor } from '@/components/dashboards/DashboardEditor';
import { reportsApi } from '@/lib/apiClient';

export default async function NewDashboardPage() {
  const reports = await reportsApi.list();
  return <DashboardEditor mode="create" reports={reports} />;
}

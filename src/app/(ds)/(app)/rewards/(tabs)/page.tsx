import { loadRewardsOverviewData } from '@/features/rewards/overview/overviewData';
import { RewardsOverview } from '@/features/rewards/overview/RewardsOverview';

export default async function DsRewardsPage() {
  return <RewardsOverview data={await loadRewardsOverviewData()} />;
}

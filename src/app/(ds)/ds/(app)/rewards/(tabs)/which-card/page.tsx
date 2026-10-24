import { RewardsLoadError } from '@/features/accounts/detail/rewards/RewardsStates';
import { WhichCard } from '@/features/rewards/which-card/WhichCard';
import { loadWhichCardData } from '@/features/rewards/which-card/whichCardData';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsWhichCardPage() {
  const data = await loadWhichCardData();
  if (!data) return <RewardsLoadError what="cards" />;
  return <WhichCard data={data} today={todayInAppZone()} />;
}

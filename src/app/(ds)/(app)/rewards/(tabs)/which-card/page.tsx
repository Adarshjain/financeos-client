import { WhichCard } from '@/features/rewards/which-card/WhichCard';
import { loadWhichCardData } from '@/features/rewards/which-card/whichCardData';
import { LoadError } from '@/features/shell/LoadError';
import { todayInAppZone } from '@/lib/date-range';

export default async function DsWhichCardPage() {
  const data = await loadWhichCardData();
  if (!data.ok) return <LoadError what="cards" reference={data.reference} />;
  return <WhichCard data={data.data} today={todayInAppZone()} />;
}

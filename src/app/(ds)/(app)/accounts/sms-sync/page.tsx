import { loadSmsPageData } from '@/features/accounts/sms/smsData';
import { SmsSyncScreen } from '@/features/accounts/sms/SmsSyncScreen';
import { todayInAppZone } from '@/lib/date-range';

export const metadata = { title: 'SMS sync' };

export default async function DsSmsSyncPage() {
  const data = await loadSmsPageData();
  return <SmsSyncScreen data={data} today={todayInAppZone()} />;
}

import CardFeeManager from '@/components/rewards/CardFeeManager';
import { accountsApi } from '@/lib/apiClient';

export default async function CardFeesPage() {
  const accounts = await accountsApi.list().catch(() => []);

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Card Membership Fees
        </h1>
      </div>
      <CardFeeManager accounts={accounts} />
    </div>
  );
}

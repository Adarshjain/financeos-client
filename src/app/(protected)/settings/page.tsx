import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth';


export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6 p-4 max-w-4xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Settings</h1>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        {user.pictureUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.pictureUrl}
            alt={user.displayName || 'Profile'}
            className="h-14 w-14 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 object-cover shadow-sm"
          />
        )}
        <div className="flex flex-col min-w-0">
          {user.displayName && (
            <p className="font-bold text-slate-900 dark:text-white truncate">{user.displayName}</p>
          )}
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
        </div>
      </div>
      {/*<ThemeSettingsCard />*/}

      <Card className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Link href="/settings/gmail">
            <div className="flex justify-between items-center text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all cursor-pointer">
              <span>Gmail Integration</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
          </Link>
          <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800"></div>
          <Link href="/settings/ingest">
            <div className="flex justify-between items-center text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all cursor-pointer">
              <span>Statement Ingestion</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

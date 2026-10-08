import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { DeleteAccountCard } from '@/app/(protected)/settings/DeleteAccountCard';
import { ThemeSettingsCard } from '@/app/(protected)/settings/ThemeSettingsCard';
import { Card, CardContent } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth';


function SettingsRow({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <div className="flex justify-between items-center text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all cursor-pointer">
        <span>{label}</span>
        <ArrowRight className="w-4 h-4 text-slate-400" />
      </div>
    </Link>
  );
}

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-4 p-4 max-w-4xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Settings</h1>
      </div>

      <h2 className="text-2xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Profile &amp; appearance
      </h2>
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
      <Card className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <ThemeSettingsCard />
          <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800"></div>
          <SettingsRow href="/settings/gmail" label="Connections" />
          <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800"></div>
          <SettingsRow href="/settings/llm-keys" label="AI keys & routing" />
          <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800"></div>
          <SettingsRow href="/settings/notifications" label="Notifications" />
          <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800"></div>
          <SettingsRow href="/settings/activity" label="Activity" />
          <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800"></div>
          <SettingsRow href="/debug" label="Debug & diagnostics" />
        </CardContent>
      </Card>

      <DeleteAccountCard user={user} />
    </div>
  );
}

import { Activity, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function FnoPage() {
  return (
    <div className="p-4 sm:p-6 pb-24 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/investments">
          <Button variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Futures & Options (FnO)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track derivatives contracts, position margins, and options trade log
          </p>
        </div>
      </div>

      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-8 text-center shadow-sm">
        <CardContent className="space-y-4 pt-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
            <Activity className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              FnO Analytics & Tradebook
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The Futures & Options module is registered and pending active trade data integration. Import your F&O trade log or sync broker statements to get started.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <Link href="/investments">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold">
                Back to Investments
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

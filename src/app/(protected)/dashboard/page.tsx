import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Receipt, TrendingUp, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">Welcome back to your finance overview</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Accounts</p>
              <div className="p-1.5 md:p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <p className="mt-1 md:mt-2 text-lg md:text-2xl font-bold text-slate-900 dark:text-white">4</p>
            <p className="text-xs text-slate-500 mt-1">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Transactions</p>
              <div className="p-1.5 md:p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Receipt className="h-4 w-4 md:h-5 md:w-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <p className="mt-1 md:mt-2 text-lg md:text-2xl font-bold text-slate-900 dark:text-white">—</p>
            <p className="text-xs text-slate-500 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Investments</p>
              <div className="p-1.5 md:p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <p className="mt-1 md:mt-2 text-lg md:text-2xl font-bold text-slate-900 dark:text-white">—</p>
            <p className="text-xs text-slate-500 mt-1">Portfolio value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your finances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/accounts">
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-3">
                  <Wallet className="h-4 w-4" />
                  <span>Manage Accounts</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/transactions">
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4" />
                  <span>Add Transaction</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/investments">
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4" />
                  <span>Record Trade</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

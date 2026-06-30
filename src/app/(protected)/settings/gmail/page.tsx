'use client';

import { AlertCircle,ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { GmailConnect } from '../GmailConnect';

function GmailSettingsContent() {
  const searchParams = useSearchParams();
  const gmailStatus = searchParams.get('gmail');
  const email = searchParams.get('email');
  const message = searchParams.get('message');

  const isSuccess = gmailStatus === 'success';
  const isError = gmailStatus === 'error';

  return (
    <div className="space-y-6 p-4">
      {/* Page Title & Back Button */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 p-0 rounded-lg">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gmail Integration</h1>
        </div>
      </div>

      {/* Query Param Status Banners */}
      {isSuccess && (
        <Alert variant="default" className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-emerald-800 dark:text-emerald-400 font-medium">Successfully Connected</AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-500 text-sm mt-1">
            Your Gmail account <strong>{email}</strong> has been successfully linked.
            We will now process transaction alerts and statements from this account.
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-medium">Connection Error</AlertTitle>
          <AlertDescription className="text-sm mt-1">
            {message || 'An unexpected error occurred during Google authorization.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Primary Gmail Settings Control Panel */}
      <GmailConnect />
    </div>
  );
}

export default function GmailSettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <p className="text-slate-500">Loading Gmail integration dashboard...</p>
      </div>
    }>
      <GmailSettingsContent />
    </Suspense>
  );
}

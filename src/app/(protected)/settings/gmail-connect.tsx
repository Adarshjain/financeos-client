'use client';

import { useState } from 'react';
import { startGmailOAuth, syncGmail } from '@/actions/gmail';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export function GmailConnect() {
  const [loading, setLoading] = useState<'connect' | 'sync' | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleConnect = async () => {
    setLoading('connect');
    setResult(null);
    
    const response = await startGmailOAuth();
    
    if (response.success && response.data.url) {
      // Redirect to OAuth URL
      window.location.href = response.data.url;
    } else if (response.success) {
      setResult({ type: 'success', message: 'Gmail OAuth initiated. This feature is still in development.' });
    } else {
      setResult({ type: 'error', message: response.error.message });
    }
    
    setLoading(null);
  };

  const handleSync = async () => {
    setLoading('sync');
    setResult(null);
    
    const response = await syncGmail();
    
    if (response.success) {
      const count = response.data.synced ?? 0;
      setResult({
        type: 'success',
        message: count > 0
          ? `Successfully synced ${count} transactions from Gmail.`
          : 'Sync completed. No new transactions found.',
      });
    } else {
      setResult({ type: 'error', message: response.error.message });
    }
    
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      {result && (
        <Alert variant={result.type === 'success' ? 'success' : 'destructive'}>
          {result.message}
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={handleConnect}
          disabled={loading !== null}
        >
          {loading === 'connect' ? (
            <>
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
              Connect Gmail
            </>
          )}
        </Button>

        <Button
          variant="default"
          onClick={handleSync}
          disabled={loading !== null}
        >
          {loading === 'sync' ? (
            <>
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Transactions
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Note: Gmail integration is a skeleton feature. Full implementation requires OAuth configuration.
      </p>
    </div>
  );
}

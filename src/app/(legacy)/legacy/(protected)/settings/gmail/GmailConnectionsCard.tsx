'use client';

import { AlertTriangle, Loader2, Mail, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Schemas } from '@/lib/api/types';

// The spec marks `connectedAt` optional+nullable (unlike the hand-written
// GmailConnectionResponse in @/lib/types, which assumes it's always set) —
// see "Spec follow-ups" in the migration report. Render defensively instead
// of casting it away.
type GmailConnectionResponse = Schemas['GmailConnectionResponse'];

interface GmailConnectionsCardProps {
  connections: GmailConnectionResponse[];
  loading: string | null;
  isSyncing: boolean;
  onConnect: () => void;
  onDisconnect: (id: string) => void;
  onSync: () => void;
}

export function GmailConnectionsCard({
  connections,
  loading,
  isSyncing,
  onConnect,
  onDisconnect,
  onSync,
}: GmailConnectionsCardProps) {
  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Mail className="h-4 w-4 text-slate-400" />
          Connected Accounts
        </CardTitle>
        <Button
          variant="outline"
          size="xs"
          onClick={onConnect}
          disabled={loading !== null}
        >
          {loading === 'connect' ? <Loader2 className="animate-spin" /> : <Plus />}
          Add Account
        </Button>
      </CardHeader>
      <CardContent className="px-4 py-2">
        {connections.length === 0 ? (
          <EmptyState
            className="my-2"
            icon={Mail}
            title="No connected Gmail accounts found."
            description="Connect a mailbox to import bank alerts and statements automatically."
            action={
              <Button variant="link" className="text-sm" onClick={onConnect}>
                Connect your first account
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {connections.map((conn) => (
              <li key={conn.id}>
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    >
                      {conn.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {conn.email}
                        </span>
                        {conn.isPrimary && (
                          <Badge variant="success" size="sm">
                            Primary
                          </Badge>
                        )}
                        {conn.needsReconnect && (
                          <Badge
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            data-testid={`needs-reconnect-${conn.id}`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Needs reconnect
                          </Badge>
                        )}
                      </div>
                      {conn.needsReconnect && conn.authFailedAt && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          Google stopped accepting this mailbox on{' '}
                          {new Date(conn.authFailedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                          . Imports are paused until you reconnect.
                        </p>
                      )}
                      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {conn.connectedAt && (
                          <span>
                            Connected:{' '}
                            {new Date(conn.connectedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        {conn.lastSyncedAt && (
                          <span>
                            Last sync:{' '}
                            {new Date(conn.lastSyncedAt).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {conn.needsReconnect && (
                      <Button
                        variant="outline"
                        size="xs"
                        aria-label={`Reconnect ${conn.email}`}
                        onClick={onConnect}
                        disabled={loading !== null}
                      >
                        <RefreshCw />
                        Reconnect
                      </Button>
                    )}
                    <Button
                      variant="ghost-destructive"
                      size="icon-xs"
                      aria-label={`Disconnect ${conn.email}`}
                      onClick={() => onDisconnect(conn.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {connections.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatic sync runs in the background. You can also trigger an
              ingestion manually.
            </p>
            <Button
              variant="outline"
              size="xs"
              className="self-start sm:self-auto shrink-0"
              onClick={onSync}
              disabled={loading !== null || isSyncing}
            >
              {loading === 'sync' || isSyncing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw />
                  Manually Sync Now
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

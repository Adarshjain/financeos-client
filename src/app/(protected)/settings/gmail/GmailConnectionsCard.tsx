'use client';

import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
      <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="w-full font-semibold flex items-center">
          Connected Accounts
        </CardTitle>
        <Button
          variant="outline"
          onClick={onConnect}
          disabled={loading !== null}
          size="sm"
        >
          {loading === 'connect' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Add Account
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {connections.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-lg">
            <p className="text-slate-500 text-sm">
              No connected Gmail accounts found.
            </p>
            <Button
              variant="link"
              className="text-sm mt-1"
              onClick={onConnect}
            >
              Connect your first account
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-850">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between py-2 last:pb-0 px-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      {conn.email}
                    </span>
                    {conn.isPrimary && (
                      <Badge
                        variant="success"
                        className="text-2xs py-0 px-1.5"
                      >
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                    {conn.connectedAt && (
                      <span>
                        Connected:{' '}
                        {new Date(conn.connectedAt).toLocaleDateString()}
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
                  </div>
                </div>
                <Button
                  variant="ghost-destructive"
                  size="sm"
                  aria-label={`Disconnect ${conn.email}`}
                  onClick={() => onDisconnect(conn.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {connections.length > 0 && (
          <div className="flex items-center flex-col justify-between p-2 border-t gap-2">
            <p className="text-xs text-slate-500">
              Automatic sync runs in the background. Or trigger an ingestion
              manually:
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={loading !== null || isSyncing}
            >
              {loading === 'sync' || isSyncing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
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

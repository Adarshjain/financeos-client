'use client';

import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { GmailSenderResponse } from '@/lib/types';

interface GmailSendersCardProps {
  senders: GmailSenderResponse[];
  onOpenAddSender: () => void;
  onOpenEditSender: (sender: GmailSenderResponse) => void;
  onDeleteSender: (id: string) => void;
}

export function GmailSendersCard({
  senders,
  onOpenAddSender,
  onOpenEditSender,
  onDeleteSender,
}: GmailSendersCardProps) {
  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3 flex flex-col items-center justify-between space-y-0">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          Gmail Sender Allowlist
        </CardTitle>
        <div className="flex flex-row items-center justify-between w-full gap-2">
          <CardDescription>
            Emails from these senders will be ingested for transactions
          </CardDescription>
          <Button variant="outline" onClick={onOpenAddSender} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Sender
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {senders.length === 0 ? (
          <EmptyState
            title="No allowed senders configured yet"
            description="Add banks, credit cards, or service alerts to the allowlist."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAddSender}
              >
                Configure Sender
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {senders.map((sender) => (
              <div
                key={sender.id}
                className={`p-3 rounded-lg border flex flex-col justify-between ${
                  sender.enabled
                    ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                    : 'border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/20 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">
                        {sender.name || '(Unnamed Sender)'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 select-all">
                        {sender.senderAddress}
                      </p>
                    </div>
                    <Badge
                      variant={sender.enabled ? 'success' : 'default'}
                      className="text-2xs py-0 px-2 uppercase shrink-0"
                    >
                      {sender.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="xs"
                    className="flex-1 text-slate-600 dark:text-slate-400"
                    onClick={() => onOpenEditSender(sender)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost-destructive"
                    size="xs"
                    className="flex-1"
                    onClick={() => onDeleteSender(sender.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
// The spec marks `name` optional+nullable, where the hand-written version in
// @/lib/types only marks it optional — see "Spec follow-ups" in the
// migration report.
import type { GmailSenderResponse } from '@/lib/api/types';

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
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-4 py-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            Gmail Sender Allowlist
          </CardTitle>
          <CardDescription className="text-xs">
            Emails from these senders will be ingested for transactions
          </CardDescription>
        </div>
        <Button variant="outline" size="xs" className="shrink-0" onClick={onOpenAddSender}>
          <Plus />
          Add Sender
        </Button>
      </CardHeader>
      <CardContent className="px-4 py-2">
        {senders.length === 0 ? (
          <EmptyState
            className="my-2"
            icon={ShieldCheck}
            title="No allowed senders configured yet"
            description="Add banks, credit cards, or service alerts to the allowlist."
            action={
              <Button variant="outline" size="xs" onClick={onOpenAddSender}>
                Configure Sender
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {senders.map((sender) => (
              <li key={sender.id} className="flex items-center justify-between gap-3 py-3">
                <div className={`min-w-0 ${sender.enabled ? '' : 'opacity-60'}`}>
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {sender.name || '(Unnamed Sender)'}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400 select-all">
                    {sender.senderAddress}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant={sender.enabled ? 'success' : 'default'} size="sm" className="mr-1">
                    {sender.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                  <Button variant="ghost" size="xs" onClick={() => onOpenEditSender(sender)}>
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    variant="ghost-destructive"
                    size="icon-xs"
                    aria-label={`Delete ${sender.name || sender.senderAddress}`}
                    onClick={() => onDeleteSender(sender.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

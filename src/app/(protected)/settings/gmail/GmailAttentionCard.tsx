'use client';

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { PagedGmailAttention } from '@/lib/types';

interface GmailAttentionCardProps {
  attentionData: PagedGmailAttention;
  attentionPage: number;
  onPageChange: (page: number) => void;
  onRetry: (ledgerId: string) => void;
}

export function GmailAttentionCard({
  attentionData,
  attentionPage,
  onPageChange,
  onRetry,
}: GmailAttentionCardProps) {
  if (!attentionData || attentionData.content.length === 0) return null;

  return (
    <Card className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Needs Attention ({attentionData.totalElements})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
          {attentionData.content.map((item) => (
            <div
              key={item.id}
              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.subject || item.gmailMessageId}
                  </span>
                  <Badge
                    variant="warning"
                    className="text-2xs py-0 px-1.5 shrink-0"
                  >
                    {item.status === 'ACCOUNT_NOT_OPTED_IN'
                      ? 'Not Opted In'
                      : item.status === 'UNRESOLVED_ACCOUNT'
                      ? 'Unresolved'
                      : 'Failed'}
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-slate-400 truncate">
                  {item.status === 'ACCOUNT_NOT_OPTED_IN'
                    ? `Waiting for account ending ••${
                        item.extractedLast4 || '????'
                      } — set an ingestion date on your account to activate`
                    : item.status === 'UNRESOLVED_ACCOUNT'
                    ? `No account matching ••${
                        item.extractedLast4 || '????'
                      } — create an account to import`
                    : item.error || 'Ingestion failed permanently'}
                </p>
              </div>

              <Button
                variant="outline"
                size="xs"
                onClick={() => onRetry(item.id)}
                className="shrink-0 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          ))}
        </div>

        {attentionData.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-amber-100 dark:border-amber-900/30 text-2xs text-amber-800 dark:text-amber-300">
            <span>
              Page {attentionData.number + 1} of {attentionData.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="xs"
                disabled={attentionData.number === 0}
                onClick={() => onPageChange(attentionPage - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                disabled={
                  attentionData.number >= attentionData.totalPages - 1
                }
                onClick={() => onPageChange(attentionPage + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

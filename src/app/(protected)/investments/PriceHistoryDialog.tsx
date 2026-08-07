'use client';

import { LineChart as LineChartIcon, TrendingUp } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatMoney } from '@/lib/utils';

import { PriceHistoryPanel } from './PriceHistoryPanel';

interface PriceHistoryDialogProps {
  instrument: {
    id: string;
    name: string;
    symbol?: string;
    lastPrice?: string | number;
  };
  trigger?: React.ReactNode;
}

export function PriceHistoryDialog({ instrument, trigger }: PriceHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1 text-[10px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
          >
            <LineChartIcon className="w-3 h-3 mr-0.5" />
            History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{instrument.name}</span>
              {instrument.symbol && (
                <span className="text-xs text-slate-400 font-normal">({instrument.symbol})</span>
              )}
            </div>
            {instrument.lastPrice !== undefined && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold border-0">
                {formatMoney(instrument.lastPrice)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Historical price and NAV timeline. Manage manual price points below.
          </DialogDescription>
        </DialogHeader>

        <PriceHistoryPanel instrument={instrument} />
      </DialogContent>
    </Dialog>
  );
}

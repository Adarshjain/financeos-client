'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Broker } from '@/lib/account.types';

import { CreateInvestmentForm } from './CreateInvestmentForm';

interface RecordTradeDialogProps {
  brokerAccounts: Broker[];
  trigger?: React.ReactNode;
}

export function RecordTradeDialog({ brokerAccounts, trigger }: RecordTradeDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm h-8 px-3">
            <Plus className="w-3.5 h-3.5" />
            Record Trade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-full sm:max-w-xl max-h-[92vh] overflow-y-auto p-2 sm:p-6 rounded-none sm:rounded-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Record Trade</DialogTitle>
          <DialogDescription>Record a new Buy or Sell trade transaction</DialogDescription>
        </DialogHeader>
        <CreateInvestmentForm brokerAccounts={brokerAccounts} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

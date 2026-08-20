'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Instrument } from '@/lib/types';

import { CreateInvestmentForm } from './CreateInvestmentForm';

interface RecordTradeDialogProps {
  brokerAccounts: Broker[];
  initialBrokerAccountId?: string;
  initialInstrument?: Instrument;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function RecordTradeDialog({
  brokerAccounts,
  initialBrokerAccountId,
  initialInstrument,
  trigger,
  onSuccess,
}: RecordTradeDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Record Trade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-full sm:max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-none sm:rounded-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Record Trade</DialogTitle>
          <DialogDescription>Record a new Buy or Sell trade transaction</DialogDescription>
        </DialogHeader>
        <CreateInvestmentForm
          brokerAccounts={brokerAccounts}
          initialBrokerAccountId={initialBrokerAccountId}
          initialInstrument={initialInstrument}
          onSuccess={() => {
            setOpen(false);
            // Re-run the server component so new positions + freshly auto-fetched prices show
            // without a manual reload.
            router.refresh();
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

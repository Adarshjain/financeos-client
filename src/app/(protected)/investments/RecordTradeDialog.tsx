'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Broker, isAccountOfType } from '@/lib/account.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType, Instrument } from '@/lib/types';

import { CreateInvestmentForm } from './CreateInvestmentForm';

interface RecordTradeDialogProps {
  brokerAccounts?: Broker[];
  initialBrokerAccountId?: string;
  initialInstrument?: Instrument;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function RecordTradeDialog({
  brokerAccounts: propBrokerAccounts,
  initialBrokerAccountId,
  initialInstrument,
  trigger,
  onSuccess,
}: RecordTradeDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const { data: accounts = [] } = useAccounts();

  const brokerAccounts =
    propBrokerAccounts ?? accounts.filter(isAccountOfType(AccountType.BROKER));

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
      <DialogContent className="w-full max-w-full sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Record Trade</DialogTitle>
          <DialogDescription>
            Record a new Buy or Sell trade transaction
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="p-0">
          <CreateInvestmentForm
            brokerAccounts={brokerAccounts}
            initialBrokerAccountId={initialBrokerAccountId}
            initialInstrument={initialInstrument}
            onSuccess={() => {
              setOpen(false);
              onSuccess?.();
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

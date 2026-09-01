'use client';

import { Edit, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Broker } from '@/lib/account.types';
import { Dividend, Position } from '@/lib/types';

import { DividendFormFields } from './dividend/DividendFormFields';
import { useDividendDialog } from './dividend/useDividendDialog';

export interface DividendDialogProps {
  mode?: 'create' | 'edit';
  dividend?: Dividend;
  brokerAccounts: Broker[];
  positions?: Position[];
  initialBrokerAccountId?: string;
  initialInstrumentId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function DividendDialog({
  mode = 'create',
  dividend,
  brokerAccounts,
  positions = [],
  initialBrokerAccountId,
  initialInstrumentId,
  trigger,
  onSuccess,
}: DividendDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    isEdit,
    isSubmitting,
    brokerAccountId,
    setBrokerAccountId,
    instrumentId,
    setInstrumentId,
    type,
    setType,
    amount,
    setAmount,
    perUnit,
    setPerUnit,
    tds,
    setTds,
    exDate,
    setExDate,
    payDate,
    setPayDate,
    notes,
    setNotes,
    brokerPositions,
    handleSubmit,
  } = useDividendDialog({
    mode,
    dividend,
    brokerAccounts,
    positions,
    initialBrokerAccountId,
    initialInstrumentId,
    open,
    setOpen,
    onSuccess,
  });

  const defaultTrigger = isEdit ? (
    <Button variant="ghost" size="sm">
      <Edit className="w-3.5 h-3.5 mr-1" />
      Edit
    </Button>
  ) : (
    <Button size="sm">
      <Plus className="w-4 h-4 mr-1.5" />
      Record Dividend
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Dividend' : 'Record Dividend / Payout'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isEdit
              ? 'Update payout amount, dates, or tax deduction.'
              : 'Log received dividend, interest payout, or distribution.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <DividendFormFields
            brokerAccountId={brokerAccountId}
            setBrokerAccountId={setBrokerAccountId}
            setInstrumentId={setInstrumentId}
            brokerAccounts={brokerAccounts}
            instrumentId={instrumentId}
            brokerPositions={brokerPositions}
            type={type}
            setType={setType}
            amount={amount}
            setAmount={setAmount}
            perUnit={perUnit}
            setPerUnit={setPerUnit}
            tds={tds}
            setTds={setTds}
            exDate={exDate}
            setExDate={setExDate}
            payDate={payDate}
            setPayDate={setPayDate}
            notes={notes}
            setNotes={setNotes}
            onSubmit={handleSubmit}
          />
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting
              ? 'Saving...'
              : isEdit
              ? 'Save Changes'
              : 'Record Payout',
            type: 'submit',
            form: 'dividend-dialog-form',
            disabled: isSubmitting,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

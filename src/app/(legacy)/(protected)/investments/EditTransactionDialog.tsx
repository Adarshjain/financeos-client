'use client';

import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Broker } from '@/lib/account.types';
import {
  InvestmentTransactionResponse,
  InvestmentTransactionType,
  SettlementType,
} from '@/lib/types';

import { EditTransactionItemizedCharges } from './edit-transaction/EditTransactionItemizedCharges';
import { useEditTransactionDialog } from './edit-transaction/useEditTransactionDialog';

interface EditTransactionDialogProps {
  transaction: InvestmentTransactionResponse;
  brokerAccounts?: Broker[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditTransactionDialog({
  transaction,
  brokerAccounts: _brokerAccounts = [],
  trigger,
  onSuccess,
}: EditTransactionDialogProps) {
  const [open, setOpen] = useState(false);

  const {
    isDeleting,
    isSubmitting,
    type,
    setType,
    settlementType,
    setSettlementType,
    quantity,
    setQuantity,
    price,
    setPrice,
    tradeDate,
    setTradeDate,
    notes,
    setNotes,
    brokerage,
    setBrokerage,
    stt,
    setStt,
    exchangeTxnCharges,
    setExchangeTxnCharges,
    sebiCharges,
    setSebiCharges,
    stampDuty,
    setStampDuty,
    gst,
    setGst,
    dpCharges,
    setDpCharges,
    otherCharges,
    setOtherCharges,
    handleDelete,
    handleSubmit,
  } = useEditTransactionDialog({
    transaction,
    open,
    setOpen,
    onSuccess,
  });

  const instrumentName = transaction.instrument?.name || 'Instrument';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-bold">
            Edit Trade ({instrumentName})
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form
            id="edit-transaction-form"
            onSubmit={handleSubmit}
            className="space-y-3 py-1"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Broker Account
              </Label>
              <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                {transaction.brokerName}{' '}
                {transaction.provider ? `(${transaction.provider})` : ''}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Instrument
              </Label>
              <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                {transaction.instrument.name}
                {transaction.instrument.symbol
                  ? ` (${transaction.instrument.symbol})`
                  : ''}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Type
                </Label>
                <Select
                  value={type}
                  onValueChange={(val) =>
                    setType(val as InvestmentTransactionType)
                  }
                >
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectItem value="buy" className="text-xs">
                      Buy
                    </SelectItem>
                    <SelectItem value="sell" className="text-xs">
                      Sell
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <FormField
                label="Trade Date"
                name="tradeDate"
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Settlement (CNC/MIS)
                </Label>
                <Select
                  value={settlementType}
                  onValueChange={(val) =>
                    setSettlementType(val as SettlementType)
                  }
                >
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Select settlement" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectItem value="delivery" className="text-xs">
                      Delivery (CNC)
                    </SelectItem>
                    <SelectItem value="intraday" className="text-xs">
                      Intraday (MIS)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Quantity"
                name="quantity"
                type="number"
                step="0.0001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />

              <FormField
                label="Price (INR)"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <EditTransactionItemizedCharges
              brokerage={brokerage}
              setBrokerage={setBrokerage}
              stt={stt}
              setStt={setStt}
              exchangeTxnCharges={exchangeTxnCharges}
              setExchangeTxnCharges={setExchangeTxnCharges}
              sebiCharges={sebiCharges}
              setSebiCharges={setSebiCharges}
              stampDuty={stampDuty}
              setStampDuty={setStampDuty}
              gst={gst}
              setGst={setGst}
              dpCharges={dpCharges}
              setDpCharges={setDpCharges}
              otherCharges={otherCharges}
              setOtherCharges={setOtherCharges}
            />

            <FormField
              label="Notes"
              name="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {isDeleting ? 'Deleting...' : 'Delete Trade'}
              </Button>
            </div>
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting ? 'Saving...' : 'Save Changes',
            type: 'submit',
            form: 'edit-transaction-form',
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

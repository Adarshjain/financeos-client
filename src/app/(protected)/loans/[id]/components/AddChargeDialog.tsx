'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LoanChargeType } from '@/lib/types';

interface AddChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargeType: LoanChargeType;
  setChargeType: (t: LoanChargeType) => void;
  chargeAmount: string;
  setChargeAmount: (a: string) => void;
  chargeDate: string;
  setChargeDate: (d: string) => void;
  chargeNotes: string;
  setChargeNotes: (n: string) => void;
  chargeTxId: string;
  setChargeTxId: (id: string) => void;
  submittingCharge: boolean;
  onAddCharge: (e: React.FormEvent) => Promise<void>;
}

export function AddChargeDialog({
  open,
  onOpenChange,
  chargeType,
  setChargeType,
  chargeAmount,
  setChargeAmount,
  chargeDate,
  setChargeDate,
  chargeNotes,
  setChargeNotes,
  chargeTxId,
  setChargeTxId,
  submittingCharge,
  onAddCharge,
}: AddChargeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Add Itemized Charge
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="add-charge-form"
            onSubmit={onAddCharge}
            className="space-y-3 pt-1 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs">Charge Type *</Label>
              <Select
                value={chargeType}
                onValueChange={(v) => setChargeType(v as LoanChargeType)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processing_fee" className="text-xs">
                    Processing Fee
                  </SelectItem>
                  <SelectItem value="insurance_premium" className="text-xs">
                    Insurance Premium
                  </SelectItem>
                  <SelectItem value="foreclosure_charge" className="text-xs">
                    Foreclosure Charge
                  </SelectItem>
                  <SelectItem value="bounce_charge" className="text-xs">
                    Bounce Charge
                  </SelectItem>
                  <SelectItem value="late_fee" className="text-xs">
                    Late Fee
                  </SelectItem>
                  <SelectItem value="legal_valuation" className="text-xs">
                    Legal / Valuation
                  </SelectItem>
                  <SelectItem value="other" className="text-xs">
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 5000"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Charge Date *</Label>
              <Input
                type="date"
                value={chargeDate}
                onChange={(e) => setChargeDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes (Optional)</Label>
              <Textarea
                rows={2}
                placeholder="Description..."
                value={chargeNotes}
                onChange={(e) => setChargeNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Linked Transaction ID (Optional)
              </Label>
              <Input
                placeholder="UUID of transaction"
                value={chargeTxId}
                onChange={(e) => setChargeTxId(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: submittingCharge ? 'Saving...' : 'Add Charge',
            type: 'submit',
            form: 'add-charge-form',
            disabled: submittingCharge,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

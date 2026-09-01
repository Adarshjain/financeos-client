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
import { AdjustmentMode, LoanEventType } from '@/lib/types';

interface RecordEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: LoanEventType;
  setEventType: (t: LoanEventType) => void;
  effectiveDate: string;
  setEffectiveDate: (d: string) => void;
  newAnnualRatePct: string;
  setNewAnnualRatePct: (r: string) => void;
  eventAmount: string;
  setEventAmount: (a: string) => void;
  adjustmentMode: AdjustmentMode;
  setAdjustmentMode: (m: AdjustmentMode) => void;
  newEmiOverride: string;
  setNewEmiOverride: (o: string) => void;
  eventTxId: string;
  setEventTxId: (id: string) => void;
  submittingEvent: boolean;
  onAddEvent: (e: React.FormEvent) => Promise<void>;
}

export function RecordEventDialog({
  open,
  onOpenChange,
  eventType,
  setEventType,
  effectiveDate,
  setEffectiveDate,
  newAnnualRatePct,
  setNewAnnualRatePct,
  eventAmount,
  setEventAmount,
  adjustmentMode,
  setAdjustmentMode,
  newEmiOverride,
  setNewEmiOverride,
  eventTxId,
  setEventTxId,
  submittingEvent,
  onAddEvent,
}: RecordEventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Record Lifecycle Event
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="add-event-form"
            onSubmit={onAddEvent}
            className="space-y-3 pt-1 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs">Event Type *</Label>
              <Select
                value={eventType}
                onValueChange={(v) => setEventType(v as LoanEventType)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rate_change" className="text-xs">
                    Rate Change
                  </SelectItem>
                  <SelectItem value="prepayment" className="text-xs">
                    Prepayment
                  </SelectItem>
                  <SelectItem value="foreclosure" className="text-xs">
                    Foreclosure
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Effective Date *</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            {eventType === 'rate_change' && (
              <div className="space-y-1">
                <Label className="text-xs">New Annual Rate (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 9.25"
                  value={newAnnualRatePct}
                  onChange={(e) => setNewAnnualRatePct(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            )}

            {(eventType === 'prepayment' || eventType === 'foreclosure') && (
              <div className="space-y-1">
                <Label className="text-xs">Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 100000"
                  value={eventAmount}
                  onChange={(e) => setEventAmount(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            )}

            {eventType !== 'foreclosure' && (
              <div className="space-y-1">
                <Label className="text-xs">Adjustment Mode *</Label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="adjMode"
                      checked={adjustmentMode === 'reduce_tenure'}
                      onChange={() => setAdjustmentMode('reduce_tenure')}
                    />
                    <span>Reduce Tenure</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="adjMode"
                      checked={adjustmentMode === 'reduce_emi'}
                      onChange={() => setAdjustmentMode('reduce_emi')}
                    />
                    <span>Reduce EMI</span>
                  </label>
                </div>
              </div>
            )}

            {eventType !== 'foreclosure' &&
              adjustmentMode === 'reduce_emi' && (
                <div className="space-y-1">
                  <Label className="text-xs">New EMI Override (Optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Auto if blank"
                    value={newEmiOverride}
                    onChange={(e) => setNewEmiOverride(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

            <div className="space-y-1">
              <Label className="text-xs">Linked Transaction ID (Optional)</Label>
              <Input
                placeholder="UUID of transaction"
                value={eventTxId}
                onChange={(e) => setEventTxId(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: submittingEvent ? 'Saving...' : 'Record Event',
            type: 'submit',
            form: 'add-event-form',
            disabled: submittingEvent,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

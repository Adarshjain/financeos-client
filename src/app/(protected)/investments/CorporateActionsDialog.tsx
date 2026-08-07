'use client';

import { Edit, Info, Layers, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  createCorporateAction,
  deleteCorporateAction,
  getCorporateActions,
  updateCorporateAction,
} from '@/actions/investments';
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
import { FormField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CorporateAction, CorporateActionType, Instrument } from '@/lib/types';
import { formatDate, toCalendarDate } from '@/lib/utils';

import { InstrumentTypeahead } from './InstrumentTypeahead';

interface CorporateActionsDialogProps {
  instrument?: {
    id: string;
    name: string;
    symbol?: string;
  };
  heldQuantity?: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  initialType?: CorporateActionType;
  editAction?: CorporateAction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CorporateActionsDialog({
  instrument,
  heldQuantity,
  trigger,
  onSuccess,
  initialType,
  editAction,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CorporateActionsDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;
  const [actions, setActions] = useState<CorporateAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // Form state
  const [selectedParentInstrument, setSelectedParentInstrument] = useState<Instrument | null>(null);
  const [type, setType] = useState<CorporateActionType>(initialType || 'split');
  const [ratioFrom, setRatioFrom] = useState('1');
  const [ratioTo, setRatioTo] = useState('2');
  const [exDate, setExDate] = useState(toCalendarDate(new Date()));
  const [notes, setNotes] = useState('');
  const [targetInstrument, setTargetInstrument] = useState<Instrument | null>(null);
  const [costAllocationPct, setCostAllocationPct] = useState('20');
  const [fractionalCashInLieu, setFractionalCashInLieu] = useState('');

  const activeInstrument = instrument || (selectedParentInstrument ? {
    id: selectedParentInstrument.id,
    name: selectedParentInstrument.name,
    symbol: selectedParentInstrument.symbol,
  } : null);

  const fetchActions = useCallback(async () => {
    if (!activeInstrument?.id) return;
    setIsLoading(true);
    try {
      const res = await getCorporateActions(activeInstrument.id);
      if (res.success) {
        setActions(res.data || []);
      }
    } catch {
      // Ignore initial error fallback
    } finally {
      setIsLoading(false);
    }
  }, [activeInstrument?.id]);

  useEffect(() => {
    if (open) {
      if (!editingActionId && initialType) {
        setType(initialType);
      }
      fetchActions();
    }
  }, [open, fetchActions, initialType, editingActionId]);

  const resetForm = () => {
    setEditingActionId(null);
    setSelectedParentInstrument(null);
    setType(initialType || 'split');
    setRatioFrom('1');
    setRatioTo('2');
    setExDate(toCalendarDate(new Date()));
    setNotes('');
    setTargetInstrument(null);
    setCostAllocationPct('20');
    setFractionalCashInLieu('');
  };

  const handleEditClick = (act: CorporateAction) => {
    setEditingActionId(act.id);
    if (!instrument && act.instrumentId) {
      setSelectedParentInstrument({
        id: act.instrumentId,
        type: 'stock',
        name: act.instrumentName || 'Instrument',
        symbol: act.instrumentSymbol,
        currency: 'INR',
      });
    }
    setType(act.type);
    setRatioFrom(String(act.ratioFrom));
    setRatioTo(String(act.ratioTo));
    setExDate(act.exDate?.split('T')[0] || toCalendarDate(new Date()));
    setNotes(act.notes || '');
    if (act.targetInstrumentId) {
      setTargetInstrument({
        id: act.targetInstrumentId,
        type: 'stock',
        name: act.targetInstrumentName || 'Target Instrument',
        symbol: act.targetInstrumentSymbol,
        currency: 'INR',
      });
    } else {
      setTargetInstrument(null);
    }
    setCostAllocationPct(act.costAllocationPct ? String(act.costAllocationPct) : '20');
    setFractionalCashInLieu(act.fractionalCashInLieu !== undefined && act.fractionalCashInLieu !== null ? String(act.fractionalCashInLieu) : '');
  };

  // When opened in "edit" mode (e.g. from the global Corporate Actions section),
  // pre-fill the form for the action being edited rather than showing "add new".
  useEffect(() => {
    if (open && editAction) {
      handleEditClick(editAction);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editAction?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInstrument?.id) {
      toast.error('Please select an instrument.');
      return;
    }
    const fromNum = Number(ratioFrom);
    const toNum = Number(ratioTo);

    if (!fromNum || fromNum <= 0 || !toNum || toNum <= 0) {
      toast.error('Please enter valid ratio numbers.');
      return;
    }
    if (!exDate) {
      toast.error('Ex-date is required.');
      return;
    }

    if (type === 'demerger' || type === 'merger') {
      if (!targetInstrument?.id) {
        toast.error(`Target ${type === 'merger' ? 'acquirer' : 'child'} instrument is required.`);
        return;
      }
      if (targetInstrument.id === activeInstrument.id) {
        toast.error('Target instrument must be different from parent instrument.');
        return;
      }
      if (type === 'demerger') {
        const costPctNum = Number(costAllocationPct);
        if (!costPctNum || costPctNum <= 0 || costPctNum > 100) {
          toast.error('Cost allocation % must be between 0 and 100.');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type,
        ratioFrom: fromNum,
        ratioTo: toNum,
        exDate,
        notes: notes || undefined,
        targetInstrumentId: (type === 'demerger' || type === 'merger') ? targetInstrument?.id : undefined,
        costAllocationPct: type === 'demerger' ? Number(costAllocationPct) : undefined,
        fractionalCashInLieu: (type === 'demerger' || type === 'merger') ? (fractionalCashInLieu ? Number(fractionalCashInLieu) : 0) : undefined,
      };

      if (editingActionId) {
        const res = await updateCorporateAction(activeInstrument.id, editingActionId, payload);

        if (res.success) {
          toast.success(`Updated ${type} (${ratioFrom}:${ratioTo})`);
          resetForm();
          fetchActions();
          router.refresh();
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      } else {
        const res = await createCorporateAction(activeInstrument.id, payload);

        if (res.success) {
          toast.success(`Recorded ${type} (${ratioFrom}:${ratioTo}) for ${activeInstrument.name}`);
          resetForm();
          fetchActions();
          router.refresh();
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      }
    } catch (err) {
      toast.error('Failed to save corporate action: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (actionId: string) => {
    if (!activeInstrument?.id) return;
    if (!confirm('Are you sure you want to delete this corporate action?')) return;
    setDeletingId(actionId);
    try {
      const res = await deleteCorporateAction(activeInstrument.id, actionId);
      if (res.success) {
        toast.success('Corporate action deleted');
        if (editingActionId === actionId) resetForm();
        fetchActions();
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to delete corporate action: ' + (err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const fromNum = Number(ratioFrom);
  const toNum = Number(ratioTo);
  const hasValidRatio = fromNum > 0 && toNum > 0;
  const entitlement = (heldQuantity !== undefined && heldQuantity > 0 && hasValidRatio)
    ? (heldQuantity * toNum) / fromNum
    : 0;
  const wholeShares = Math.floor(entitlement);
  const fracShares = entitlement > 0 ? Number((entitlement - wholeShares).toFixed(4)) : 0;
  const showCashInLieuField = (type === 'demerger' || type === 'merger') && (
    heldQuantity === undefined || fracShares > 0 || (editingActionId !== null && Boolean(fractionalCashInLieu))
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40">
            <Layers className="w-3 h-3 mr-1" />
            Corporate Actions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6 max-w-full sm:max-w-lg overflow-x-hidden gap-0">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-start sm:items-start gap-2 min-w-0">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0 break-words items-start">
              <div>Corporate Actions</div>
              {activeInstrument && <div>{activeInstrument.name}</div>}
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 pb-2">
            Manage stock splits, bonus, demergers, and mergers.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2 min-w-0">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0 break-words">
            <span className="font-semibold">Note:</span> Position quantities and cost bases auto-adjust when corporate actions are added or updated.
          </div>
        </div>

        {/* Existing Corporate Actions List */}
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Recorded Actions</h4>
          {isLoading ? (
            <div className="text-xs text-slate-400 py-2">Loading...</div>
          ) : actions.length === 0 ? (
            <div className="text-xs text-slate-400 py-2 italic">No corporate actions recorded yet for this instrument.</div>
          ) : (
            <div className="space-y-2">
              {actions.map((act) => (
                <div key={act.id} className={`p-2.5 rounded-md border flex items-center justify-between text-xs gap-2 ${editingActionId === act.id ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shrink-0">
                        {act.type}
                      </Badge>
                      <span className="break-words">
                        Ratio: {act.ratioFrom} → {act.ratioTo}
                      </span>
                    </div>
                    {act.type === 'demerger' && (
                      <div className="text-[11px] font-medium text-purple-700 dark:text-purple-300 break-words">
                        Child: {act.targetInstrumentName || 'Target'} {act.targetInstrumentSymbol ? `(${act.targetInstrumentSymbol})` : ''} • Cost Alloc: {act.costAllocationPct}%{act.fractionalCashInLieu !== undefined && act.fractionalCashInLieu !== null ? ` • cash-in-lieu ₹${act.fractionalCashInLieu}` : ''}
                      </div>
                    )}
                    {act.type === 'merger' && (
                      <div className="text-[11px] font-medium text-purple-700 dark:text-purple-300 break-words">
                        Merged into {act.targetInstrumentName || 'Acquirer'} {act.targetInstrumentSymbol ? `(${act.targetInstrumentSymbol})` : ''} • swap {act.ratioFrom}:{act.ratioTo}{act.fractionalCashInLieu !== undefined && act.fractionalCashInLieu !== null ? ` • cash-in-lieu ₹${act.fractionalCashInLieu}` : ''}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 break-words">
                      Ex-Date: {formatDate(act.exDate)} {act.notes ? `• ${act.notes}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(act)}
                      className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(act.id)}
                      disabled={deletingId === act.id}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add / Edit Action Form */}
        <form onSubmit={handleSubmit} className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              {editingActionId ? (
                <>
                  <Edit className="w-3.5 h-3.5 text-purple-600" />
                  Edit Corporate Action
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  Add Corporate Action
                </>
              )}
            </h4>
            {editingActionId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="h-6 text-[10px] text-slate-500 hover:text-slate-900"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel Edit
              </Button>
            )}
          </div>

          {!instrument && !editingActionId && (
            <div className="space-y-1 min-w-0">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words">
                Parent Instrument *
              </Label>
              <InstrumentTypeahead
                selectedInstrument={selectedParentInstrument}
                onSelect={setSelectedParentInstrument}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Action Type</Label>
              <Select value={type} onValueChange={(val) => setType(val as CorporateActionType)}>
                <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectItem value="split" className="text-xs">Stock Split</SelectItem>
                  <SelectItem value="bonus" className="text-xs">Bonus Issue</SelectItem>
                  <SelectItem value="demerger" className="text-xs">Demerger / Spin-off</SelectItem>
                  <SelectItem value="merger" className="text-xs">Merger / Amalgamation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FormField
              label="Ex-Date"
              name="exDate"
              type="date"
              value={exDate}
              onChange={(e) => setExDate(e.target.value)}
              required
            />
          </div>

          {(type === 'demerger' || type === 'merger') && (
            <div className="space-y-2 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 min-w-0">
              <div className="space-y-1 min-w-0">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words">
                  {type === 'merger' ? 'Surviving (Acquirer) Instrument *' : 'Target (Child) Instrument *'}
                </Label>
                <InstrumentTypeahead
                  selectedInstrument={targetInstrument}
                  onSelect={setTargetInstrument}
                />
              </div>

              {type === 'demerger' && (
                <FormField
                  label="Cost Allocation % (Sec 49(2C)) *"
                  name="costAllocationPct"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={costAllocationPct}
                  onChange={(e) => setCostAllocationPct(e.target.value)}
                  placeholder="e.g. 20.0"
                  required
                />
              )}
            </div>
          )}

          <div className="space-y-1 min-w-0">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 break-words">
              {type === 'merger'
                ? 'Swap Ratio (transferor held → acquirer received)'
                : type === 'demerger'
                ? 'Share Entitlement Ratio (parent held → child received)'
                : 'Ratio (units before → units after)'}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
              <FormField
                label={type === 'merger' ? 'Transferor Shares Held' : type === 'demerger' ? 'Parent Shares Held' : 'Ratio From (Held)'}
                name="ratioFrom"
                type="number"
                step="1"
                min="1"
                value={ratioFrom}
                onChange={(e) => setRatioFrom(e.target.value)}
                required
              />
              <FormField
                label={type === 'merger' ? 'Acquirer Shares Received' : type === 'demerger' ? 'Child Shares Received' : 'Ratio To (Resulting)'}
                name="ratioTo"
                type="number"
                step="1"
                min="1"
                value={ratioTo}
                onChange={(e) => setRatioTo(e.target.value)}
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 italic break-words">
              {type === 'merger'
                ? 'Example: HDFC → HDFC Bank was 25 → 42.'
                : type === 'demerger'
                ? 'Example: For 1 child share per 2 parent shares held, enter 2 → 1.'
                : 'Example: For a 2-for-1 split, enter 1 → 2. For a 1:1 bonus issue, enter 1 → 2.'}
            </p>
          </div>

          {(type === 'demerger' || type === 'merger') && (
            <div className="space-y-2 pt-1 min-w-0">
              {heldQuantity !== undefined && heldQuantity > 0 && hasValidRatio && fracShares > 0 && (
                <div className="p-2.5 rounded-md bg-purple-100/60 dark:bg-purple-950/40 text-xs text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 break-words">
                  You&apos;ll receive <strong className="font-semibold">{wholeShares}</strong> whole shares + cash-in-lieu for <strong className="font-semibold">{fracShares}</strong> fractional shares.
                </div>
              )}

              {showCashInLieuField && (
                <FormField
                  label="Cash-in-lieu received (₹)"
                  name="fractionalCashInLieu"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fractionalCashInLieu}
                  onChange={(e) => setFractionalCashInLieu(e.target.value)}
                  placeholder="0.00"
                  hint="Leave 0 if not yet known — you can edit this action later."
                />
              )}
            </div>
          )}

          <FormField
            label="Notes"
            name="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional reference / details"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="w-full sm:w-auto text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? 'Saving Action...' : editingActionId ? 'Update Corporate Action' : 'Save Corporate Action'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

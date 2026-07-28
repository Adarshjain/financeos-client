'use client';

import { Edit, Info, Layers, Plus, Trash2, X } from 'lucide-react';
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
import { CorporateAction, CorporateActionType } from '@/lib/types';
import { formatDate, toCalendarDate } from '@/lib/utils';

interface CorporateActionsDialogProps {
  instrument: {
    id: string;
    name: string;
    symbol?: string;
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CorporateActionsDialog({ instrument, trigger, onSuccess }: CorporateActionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [actions, setActions] = useState<CorporateAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<CorporateActionType>('split');
  const [ratioFrom, setRatioFrom] = useState('1');
  const [ratioTo, setRatioTo] = useState('2');
  const [exDate, setExDate] = useState(toCalendarDate(new Date()));
  const [notes, setNotes] = useState('');

  const fetchActions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getCorporateActions(instrument.id);
      if (res.success) {
        setActions(res.data || []);
      }
    } catch {
      // Ignore initial error fallback
    } finally {
      setIsLoading(false);
    }
  }, [instrument.id]);

  useEffect(() => {
    if (open) {
      fetchActions();
    }
  }, [open, fetchActions]);

  const resetForm = () => {
    setEditingActionId(null);
    setType('split');
    setRatioFrom('1');
    setRatioTo('2');
    setExDate(toCalendarDate(new Date()));
    setNotes('');
  };

  const handleEditClick = (act: CorporateAction) => {
    setEditingActionId(act.id);
    setType(act.type);
    setRatioFrom(String(act.ratioFrom));
    setRatioTo(String(act.ratioTo));
    setExDate(act.exDate?.split('T')[0] || toCalendarDate(new Date()));
    setNotes(act.notes || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setIsSubmitting(true);
    try {
      if (editingActionId) {
        const res = await updateCorporateAction(instrument.id, editingActionId, {
          type,
          ratioFrom: fromNum,
          ratioTo: toNum,
          exDate,
          notes: notes || undefined,
        });

        if (res.success) {
          toast.success(`Updated ${type} (${ratioFrom}:${ratioTo})`);
          resetForm();
          fetchActions();
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      } else {
        const res = await createCorporateAction(instrument.id, {
          type,
          ratioFrom: fromNum,
          ratioTo: toNum,
          exDate,
          notes: notes || undefined,
        });

        if (res.success) {
          toast.success(`Recorded ${type} (${ratioFrom}:${ratioTo}) for ${instrument.name}`);
          resetForm();
          fetchActions();
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
    if (!confirm('Are you sure you want to delete this corporate action?')) return;
    setDeletingId(actionId);
    try {
      const res = await deleteCorporateAction(instrument.id, actionId);
      if (res.success) {
        toast.success('Corporate action deleted');
        if (editingActionId === actionId) resetForm();
        fetchActions();
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
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Corporate Actions — {instrument.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Manage stock splits and bonus share distributions.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
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
                <div key={act.id} className={`p-2.5 rounded-md border flex items-center justify-between text-xs ${editingActionId === act.id ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                        {act.type}
                      </Badge>
                      <span>Ratio: {act.ratioFrom} → {act.ratioTo}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Ex-Date: {formatDate(act.exDate)} {act.notes ? `• ${act.notes}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Action Type</Label>
              <Select value={type} onValueChange={(val) => setType(val as CorporateActionType)}>
                <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectItem value="split" className="text-xs">Stock Split</SelectItem>
                  <SelectItem value="bonus" className="text-xs">Bonus Issue</SelectItem>
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

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ratio (units before → units after)
            </Label>
            <div className="grid grid-cols-2 gap-4 items-center">
              <FormField
                label="Ratio From (Held)"
                name="ratioFrom"
                type="number"
                step="1"
                min="1"
                value={ratioFrom}
                onChange={(e) => setRatioFrom(e.target.value)}
                required
              />
              <FormField
                label="Ratio To (Resulting)"
                name="ratioTo"
                type="number"
                step="1"
                min="1"
                value={ratioTo}
                onChange={(e) => setRatioTo(e.target.value)}
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Example: For a 2-for-1 split, enter 1 → 2. For a 1:1 bonus issue, enter 1 → 2.
            </p>
          </div>

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
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? 'Saving Action...' : editingActionId ? 'Update Corporate Action' : 'Save Corporate Action'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

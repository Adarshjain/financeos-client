'use client';

import { Edit, Info, Layers, Plus, X } from 'lucide-react';
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
import { CorporateAction } from '@/lib/api/types';

import { CorporateActionFormFields } from './corporate-actions/CorporateActionFormFields';
import { RecordedActionsList } from './corporate-actions/RecordedActionsList';
import {
  CorporateActionKind,
  useCorporateActionsDialog,
} from './corporate-actions/useCorporateActionsDialog';

interface CorporateActionsDialogProps {
  instrument?: {
    id: string;
    name: string;
    symbol?: string;
  };
  heldQuantity?: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  initialType?: CorporateActionKind;
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
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  const {
    actions,
    isLoading,
    isSubmitting,
    deletingId,
    editingActionId,
    selectedParentInstrument,
    setSelectedParentInstrument,
    type,
    setType,
    ratioFrom,
    setRatioFrom,
    ratioTo,
    setRatioTo,
    exDate,
    setExDate,
    notes,
    setNotes,
    targetInstrument,
    setTargetInstrument,
    costAllocationPct,
    setCostAllocationPct,
    fractionalCashInLieu,
    setFractionalCashInLieu,
    activeInstrument,
    hasValidRatio,
    fracShares,
    wholeShares,
    showCashInLieuField,
    resetForm,
    handleEditClick,
    handleSubmit,
    handleDelete,
  } = useCorporateActionsDialog({
    instrument,
    heldQuantity,
    initialType,
    editAction,
    open,
    onSuccess,
  });

  const showTrigger = trigger !== undefined || controlledOpen === undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {trigger || (
            <Button
              size="micro"
              className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
            >
              <Layers className="w-3 h-3 mr-1" />
              Corporate Actions
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-full sm:max-w-lg overflow-x-hidden">
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

        <DialogBody className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 min-w-0">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 break-words">
              <span className="font-semibold">Note:</span> Position quantities
              and cost bases auto-adjust when corporate actions are added or
              updated.
            </div>
          </div>

          {/* Existing Corporate Actions List */}
          <RecordedActionsList
            actions={actions}
            isLoading={isLoading}
            editingActionId={editingActionId}
            deletingId={deletingId}
            onEditClick={handleEditClick}
            onDeleteClick={handleDelete}
          />

          {/* Add / Edit Action Form */}
          <form
            id="corporate-action-form"
            onSubmit={handleSubmit}
            className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3"
          >
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
                  size="micro"
                  onClick={resetForm}
                  className="text-slate-500 hover:text-slate-900"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel Edit
                </Button>
              )}
            </div>

            <CorporateActionFormFields
              instrument={instrument}
              editingActionId={editingActionId}
              selectedParentInstrument={selectedParentInstrument}
              setSelectedParentInstrument={setSelectedParentInstrument}
              type={type}
              setType={setType}
              exDate={exDate}
              setExDate={setExDate}
              targetInstrument={targetInstrument}
              setTargetInstrument={setTargetInstrument}
              costAllocationPct={costAllocationPct}
              setCostAllocationPct={setCostAllocationPct}
              ratioFrom={ratioFrom}
              setRatioFrom={setRatioFrom}
              ratioTo={ratioTo}
              setRatioTo={setRatioTo}
              heldQuantity={heldQuantity}
              hasValidRatio={hasValidRatio}
              fracShares={fracShares}
              wholeShares={wholeShares}
              showCashInLieuField={showCashInLieuField}
              fractionalCashInLieu={fractionalCashInLieu}
              setFractionalCashInLieu={setFractionalCashInLieu}
              notes={notes}
              setNotes={setNotes}
            />
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting
              ? 'Saving Action...'
              : editingActionId
                ? 'Update Corporate Action'
                : 'Save Corporate Action',
            type: 'submit',
            form: 'corporate-action-form',
            variant: 'purple',
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

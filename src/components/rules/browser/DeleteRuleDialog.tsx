'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategoryRule } from '@/lib/rules.types';

interface DeleteRuleDialogProps {
  deletingRule: CategoryRule | null;
  onClose: () => void;
  isDeleting: boolean;
  onDelete: () => void;
}

export function DeleteRuleDialog({
  deletingRule,
  onClose,
  isDeleting,
  onDelete,
}: DeleteRuleDialogProps) {
  return (
    <Dialog
      open={!!deletingRule}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Rule?</DialogTitle>
          <DialogDescription>
            Transactions already categorized by this rule keep their
            categories.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter
          primaryAction={{
            label: isDeleting ? 'Deleting...' : 'Delete',
            variant: 'destructive',
            onClick: onDelete,
            disabled: isDeleting,
          }}
          secondaryAction={{
            label: 'Cancel',
            disabled: isDeleting,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

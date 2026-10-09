'use client';

import React, { useRef,useState } from 'react';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { Transaction } from '@/lib/transaction.types';

import { TransactionDetailContent } from './TransactionDetailContent';
import { TransactionEditContent } from './TransactionEditContent';

interface TransactionDetailDialogProps {
  /** Null while the caller is still loading it; `placeholder` shows meanwhile. */
  transaction: Transaction | null;
  accounts: Account[];
  onMutate?: () => void;
  /** Opens the dialog on click. Omit it to drive the dialog only through `open`. */
  trigger?: React.ReactNode;
  /** Controlled open state; when absent the dialog keeps its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Shown in the same dialog while `transaction` is null (loading, or why it
   * failed), so the sheet opens once and its content fills in place.
   */
  placeholder?: React.ReactNode;
}

export const TransactionDetailDialog = ({
  transaction,
  accounts,
  onMutate,
  trigger,
  open,
  onOpenChange,
  placeholder,
}: TransactionDetailDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const showDetails = open ?? internalOpen;
  const setShowDetails = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [isEditing, setIsEditing] = useState(false);

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isEligibleRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };

    if (window.innerWidth >= 640) {
      isEligibleRef.current = false;
      return;
    }

    const target = e.target as HTMLElement;
    const scrollContainer = target.closest('.overflow-y-auto');

    if (!scrollContainer || scrollContainer.scrollTop <= 0) {
      isEligibleRef.current = true;
    } else {
      isEligibleRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isEligibleRef.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaX = touch.clientX - touchStartRef.current.x;

    if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (e.cancelable) e.preventDefault();
      setIsDragging(true);
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isEligibleRef.current) return;

    setIsDragging(false);
    if (dragOffset > 120) {
      setShowDetails(false);
    }
    setDragOffset(0);
    isEligibleRef.current = false;
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const transformStyle = dragOffset > 0 && isMobile ? `translateY(${dragOffset}px)` : undefined;
  const transitionStyle = isMobile ? (isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)') : undefined;

  return (
    <Dialog
      open={showDetails}
      onOpenChange={(next) => {
        setShowDetails(next);
        if (!next) setIsEditing(false);
      }}
    >
      {trigger !== undefined && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent
        className="sm:max-w-lg bg-slate-50 dark:bg-slate-950"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: transformStyle,
          transition: transitionStyle,
        }}
        // The details carry their own close; a placeholder has none.
        showCloseButton={transaction === null}
      >
        {transaction === null ? (
          placeholder
        ) : isEditing ? (
          <TransactionEditContent
            transaction={transaction}
            onSuccess={() => {
              setIsEditing(false);
              setShowDetails(false);
              onMutate?.();
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <TransactionDetailContent
            transaction={transaction}
            accounts={accounts}
            onEditClick={() => setIsEditing(true)}
            onCloseAndRefresh={() => {
              setShowDetails(false);
              onMutate?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

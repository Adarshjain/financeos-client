'use client';

import React, { useRef,useState } from 'react';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction } from '@/lib/transaction.types';
import { cn } from '@/lib/utils';

import { TransactionDetailContent } from './TransactionDetailContent';
import { TransactionEditContent } from './TransactionEditContent';

interface TransactionDetailDialogProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  onMutate?: () => void;
  trigger: React.ReactNode;
}

export const TransactionDetailDialog = ({
  transaction,
  accounts,
  categories,
  onMutate,
  trigger,
}: TransactionDetailDialogProps) => {
  const [showDetails, setShowDetails] = useState(false);
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
      onOpenChange={(open) => {
        setShowDetails(open);
        if (!open) setIsEditing(false);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent
        className={cn(
          'sm:max-w-lg p-0 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950',
          isEditing ? 'h-[90vh] sm:h-auto sm:max-h-[85vh]' : '',
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: transformStyle,
          transition: transitionStyle,
        }}
        hideClose
      >
        {isEditing ? (
          <TransactionEditContent
            transaction={transaction}
            accounts={accounts}
            categories={categories}
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
            onDeleteSuccess={() => {
              setShowDetails(false);
              onMutate?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

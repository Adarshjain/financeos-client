'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import { cn } from './cn';
import { DialogHandle } from './Dialog/Dialog';
import { useDsKeyboardInset } from './useKeyboardInset';
import { useSheetDrag } from './useSheetDrag';

/**
 * Marker on the content of every dropdown (Popover, Menu). Below `desk`, `ds.css` turns the Radix popper wrapper that
 * holds it into a bottom sheet with a scrim; the switch is CSS only (RULES §5.6a, §5c.3).
 */
export const SHEET_ATTRS = { 'data-ds-sheet': '' } as const;

/**
 * Phone look of a dropdown's content: the Dialog sheet (full width, top corners only, up-shadow, bottom safe area,
 * same max height, above the keyboard). Every class is `max-desk:`, so desktop keeps its dropdown untouched. Width
 * classes a call site sets (`w-max min-w-container-xs`) lose to these because variants are emitted after them.
 * The slide is the sheet's own, from the bottom, whichever side the dropdown would flip to on desktop.
 */
export const SHEET_CONTENT_CLASS = cn(
  'max-desk:w-full max-desk:max-w-none max-desk:min-w-0 max-desk:max-h-dvh-safe-keyboard max-desk:overflow-y-auto max-desk:overscroll-contain',
  'max-desk:rounded-t-ds-2xl max-desk:rounded-b-none max-desk:border-0 max-desk:border-t max-desk:border-line-soft max-desk:shadow-up-2 max-desk:pb-safe-12',
  'max-desk:slide-in-from-bottom max-desk:data-side-bottom:slide-in-from-bottom max-desk:data-side-top:slide-in-from-bottom',
  'max-desk:data-closed:slide-out-to-bottom max-desk:data-closed:data-side-bottom:slide-out-to-bottom max-desk:data-closed:data-side-top:slide-out-to-bottom',
  'max-desk:duration-slow max-desk:data-closed:duration-slow',
  '[&[data-drag-closing]]:!animate-none transition-transform ease-out motion-reduce:duration-0',
);

/** Handle and title, shown on phone only (`desk:hidden`, never a JS check). No title: just the handle. */
export function SheetHeader({ title, titleClassName }: { title?: string; titleClassName?: string }) {
  return (
    <div className="desk:hidden shrink-0">
      <KeyboardInset />
      <div className="cursor-grab active:cursor-grabbing py-space-8">
        <DialogHandle />
      </div>
      {title ? (
        <div className={cn('px-space-16 pb-space-8 font-text font-extrabold text-title text-ink leading-tight', titleClassName)}>{title}</div>
      ) : null}
    </div>
  );
}

/** Lives inside the content, which is mounted only while open: the keyboard listeners exist only then. */
function KeyboardInset() {
  useDsKeyboardInset();
  return null;
}

function assignRef<T>(ref: React.ForwardedRef<T>, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

/**
 * The sheet behaviour of a dropdown's content: sits above the keyboard while mounted, and drags down to close from
 * anywhere (phone only; the hook checks the layout at gesture start). Returns the ref to put on the content
 * (merged with the forwarded one). The close is an Escape keydown on the content, which Radix's dismissable layer
 * answers for the top layer, so Popover and DropdownMenu both close through their own state.
 */
export function useDropdownSheet<T extends HTMLElement>(forwarded: React.ForwardedRef<T>) {
  const nodeRef = useRef<T | null>(null);
  // The scrim is the popper wrapper's ::before, so the fade goes through the wrapper (the content's parent).
  const scrimRef = useRef<HTMLElement | null>(null);
  const dragRef = useSheetDrag({
    onDismiss: () => {
      nodeRef.current?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    },
    scrimRef,
  });
  // Kept in a ref so the callback below is stable: an inline ref from a caller would otherwise detach and
  // reattach the gesture on every render, resetting a drag in flight.
  const forwardedRef = useRef(forwarded);
  useEffect(() => {
    forwardedRef.current = forwarded;
  });
  return useCallback(
    (node: T | null) => {
      nodeRef.current = node;
      scrimRef.current = node?.parentElement ?? null;
      dragRef(node);
      assignRef(forwardedRef.current, node);
    },
    [dragRef],
  );
}

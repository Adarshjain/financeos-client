'use client';

// Shortcut actions: things a shortcut tile does rather than a page it opens.
// Dialog actions (Add transaction, Record lending) load their dialog's code
// only when asked — `launch` on click, `prefetchAction` on hover / focus /
// touchstart — and never mount anything on page load. Page actions are named
// links (Import statement, Ask chat, Review queue).
//
// Settle up for one person reuses the record-lending action with a preset
// (the person plus settleUpEntry(netPosition)).

import { CheckSquare, HandCoins, Import, type LucideIcon, MessageSquare, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { type ComponentType, type ReactNode, useCallback, useState } from 'react';

import type { LendingFormPreset } from '@/components/lendings/useAddLendingForm';
import { toastError } from '@/lib/toastError';

export type DialogActionId = 'add-transaction' | 'record-lending';
export type PageActionId = 'import-statement' | 'ask-chat' | 'review-queue';
export type ActionId = DialogActionId | PageActionId;

/** What a preset can seed; only record-lending takes one today. */
export type ActionPreset = LendingFormPreset;

/** Every action dialog is controlled by the launcher. */
export interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: ActionPreset;
}

interface ActionBase {
  label: string;
  icon: LucideIcon;
}
export interface DialogAction extends ActionBase {
  kind: 'dialog';
  id: DialogActionId;
}
export interface PageAction extends ActionBase {
  kind: 'page';
  id: PageActionId;
  href: string;
}
export type ShortcutAction = DialogAction | PageAction;

type DialogLoader = () => Promise<ComponentType<ActionDialogProps>>;

/** The dialog modules, fetched only through these. */
const LOADERS: Record<DialogActionId, DialogLoader> = {
  'add-transaction': () =>
    import('@/components/transactions/TransactionFormWrapper').then((m) => m.TransactionFormWrapper),
  'record-lending': () => import('@/components/lendings/RecordLendingDialog').then((m) => m.RecordLendingDialog),
};

/** The same loaders as components; rendering one only after `launch` has loaded it. */
const DIALOGS: Record<DialogActionId, ComponentType<ActionDialogProps>> = {
  'add-transaction': dynamic(LOADERS['add-transaction'], { ssr: false }),
  'record-lending': dynamic(LOADERS['record-lending'], { ssr: false }),
};

export const SHORTCUT_ACTIONS: Readonly<Record<ActionId, ShortcutAction>> = {
  'add-transaction': { kind: 'dialog', id: 'add-transaction', label: 'Add transaction', icon: Plus },
  'record-lending': { kind: 'dialog', id: 'record-lending', label: 'Record lending', icon: HandCoins },
  'import-statement': { kind: 'page', id: 'import-statement', label: 'Import statement', icon: Import, href: '/transactions/import' },
  'ask-chat': { kind: 'page', id: 'ask-chat', label: 'Ask chat', icon: MessageSquare, href: '/chat' },
  'review-queue': { kind: 'page', id: 'review-queue', label: 'Review queue', icon: CheckSquare, href: '/transactions/review' },
};

/** An action by id; null for an unknown id. */
export function getAction(id: string): ShortcutAction | null {
  return Object.hasOwn(SHORTCUT_ACTIONS, id) ? SHORTCUT_ACTIONS[id as ActionId] : null;
}

function isDialogAction(id: string): id is DialogActionId {
  return getAction(id)?.kind === 'dialog';
}

/**
 * Starts loading a dialog action's code (hover / focus / touchstart) so the
 * click opens it at once. No-op for page actions and unknown ids; a failed
 * prefetch is left for the click to retry and report.
 */
export function prefetchAction(id: string): void {
  if (isDialogAction(id)) LOADERS[id]().catch(() => undefined);
}

interface Launched {
  id: DialogActionId;
  preset?: ActionPreset;
  /** Remounts the dialog per launch so a new preset starts a fresh form. */
  seq: number;
}

export interface ActionLauncher {
  /** Loads the action's dialog (pendingId is set meanwhile), then opens it. */
  launch: (id: string, preset?: ActionPreset) => Promise<void>;
  prefetch: (id: string) => void;
  /** The action whose dialog is loading (the tile shows a spinner). */
  pendingId: DialogActionId | null;
  /** The launched dialog; render it once, anywhere. Null until the first launch. */
  dialog: ReactNode;
}

/** Opens dialog actions on demand. Nothing loads or mounts until `launch` / `prefetch`. */
export function useActionLauncher(): ActionLauncher {
  const [pendingId, setPendingId] = useState<DialogActionId | null>(null);
  const [launched, setLaunched] = useState<Launched | null>(null);
  const [open, setOpen] = useState(false);

  const launch = useCallback(async (id: string, preset?: ActionPreset) => {
    if (!isDialogAction(id)) return;
    setPendingId(id);
    try {
      await LOADERS[id]();
    } catch (e) {
      toastError(e, 'Could not open this action. Check your connection and try again.');
      return;
    } finally {
      setPendingId(null);
    }
    setLaunched((prev) => ({ id, preset, seq: (prev?.seq ?? 0) + 1 }));
    setOpen(true);
  }, []);

  let dialog: ReactNode = null;
  if (launched) {
    const Dialog = DIALOGS[launched.id];
    dialog = <Dialog key={launched.seq} open={open} onOpenChange={setOpen} preset={launched.preset} />;
  }

  return { launch, prefetch: prefetchAction, pendingId, dialog };
}

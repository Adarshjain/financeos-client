'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { amountExpressionValue, sanitizeAmountExpressionInput } from '@/lib/amountExpression';
import {
  buildLendingLedgerText,
  DEFAULT_LENDING_EXPORT_TOGGLES,
  derivedOpeningBalance,
  type ExportableEntry,
  headerLine,
  type LendingExportToggles,
  sinceLastSettledIds,
} from '@/lib/lendingExport';
import { toCalendarDate } from '@/lib/utils';

/** Per-device conveniences only (your name + toggles); selection and opening balance never persist. */
export const LENDING_EXPORT_STORAGE_KEY = 'financeos.lendingExport.v1';

interface StoredPrefs {
  myName?: string;
  toggles?: Partial<LendingExportToggles>;
}

function readStoredPrefs(): StoredPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LENDING_EXPORT_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoredPrefs) : {};
  } catch {
    return {};
  }
}

function writeStoredPrefs(prefs: StoredPrefs) {
  try {
    window.localStorage.setItem(LENDING_EXPORT_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode / blocked storage: the dialog still works, it just forgets.
  }
}

/** What the user typed into the opening-balance controls; null = follow the derived default. */
interface OpeningOverride {
  amount: string;
  theyOwe: boolean;
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

interface UseExportLedgerArgs {
  /** Every loaded entry, ascending, with running balances. */
  entries: ExportableEntry[];
  /** The person's ledger name; prefills "Their name". */
  theirName: string;
  /** The signed-in user's display name; prefills "Your name" unless a saved value exists. */
  defaultMyName: string | null;
  /** Says what Copy did. Defaults to the Legacy toaster; Dinero pages pass their own. */
  notify?: (message: string, tone: 'success' | 'danger') => void;
}

const legacyNotify = (message: string, tone: 'success' | 'danger') =>
  tone === 'success' ? toast.success(message) : toast.error(message);

export function useExportLedger({ entries, theirName, defaultMyName, notify = legacyNotify }: UseExportLedgerArgs) {
  const stored = useMemo(readStoredPrefs, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(entries.map((e) => e.id)));
  const [myName, setMyName] = useState(() => stored.myName ?? defaultMyName ?? '');
  const [theirNameInput, setTheirNameInput] = useState(theirName);
  const [toggles, setToggles] = useState<LendingExportToggles>(() => ({
    ...DEFAULT_LENDING_EXPORT_TOGGLES,
    ...stored.toggles,
  }));
  const [openingOverride, setOpeningOverride] = useState<OpeningOverride | null>(null);

  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    writeStoredPrefs({ myName, toggles });
  }, [myName, toggles]);

  // --- selection -----------------------------------------------------------
  const sinceSettled = useMemo(() => sinceLastSettledIds(entries), [entries]);
  const sinceSettledAvailable = sinceSettled.size > 0 && sinceSettled.size < entries.length;

  const toggleEntry = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectAll = useCallback(() => setSelectedIds(new Set(entries.map((e) => e.id))), [entries]);
  const selectNone = useCallback(() => setSelectedIds(new Set()), []);
  const selectSinceSettled = useCallback(() => setSelectedIds(new Set(sinceSettled)), [sinceSettled]);

  const allSelected = entries.length > 0 && selectedIds.size === entries.length;
  const noneSelected = selectedIds.size === 0;
  const sinceSettledSelected = sinceSettledAvailable && setsEqual(selectedIds, sinceSettled);

  // --- opening balance -----------------------------------------------------
  const derived = useMemo(() => derivedOpeningBalance(entries, selectedIds), [entries, selectedIds]);
  const derivedView: OpeningOverride = {
    amount: derived === 0 ? '0' : String(Math.abs(derived)),
    theyOwe: derived >= 0,
  };
  const opening = openingOverride ?? derivedView;
  const openingIsDerived = openingOverride === null;

  const parsedOpening = amountExpressionValue(opening.amount);
  const openingBalance = parsedOpening === null ? null : opening.theyOwe ? parsedOpening : -parsedOpening;
  // Text that is not a usable amount ("5+", "100/0") is an error, never silently left out of the export.
  const openingError =
    opening.amount.trim() !== '' && parsedOpening === null ? 'Enter a valid amount.' : undefined;

  const setOpeningAmount = useCallback(
    (raw: string) => setOpeningOverride({ amount: sanitizeAmountExpressionInput(raw), theyOwe: opening.theyOwe }),
    [opening.theyOwe],
  );
  const setOpeningTheyOwe = useCallback(
    (theyOwe: boolean) => setOpeningOverride({ amount: opening.amount, theyOwe }),
    [opening.amount],
  );
  const clearOpening = useCallback(
    () => setOpeningOverride({ amount: '', theyOwe: opening.theyOwe }),
    [opening.theyOwe],
  );
  const resetOpening = useCallback(() => setOpeningOverride(null), []);

  // --- toggles -------------------------------------------------------------
  const setToggle = useCallback(
    (key: keyof LendingExportToggles, value: boolean) => setToggles((prev) => ({ ...prev, [key]: value })),
    [],
  );

  // --- text ----------------------------------------------------------------
  const cleanMyName = myName.trim() || null;
  const cleanTheirName = theirNameInput.trim() || null;
  const today = toCalendarDate(new Date());

  const text = useMemo(
    () =>
      buildLendingLedgerText({
        entries,
        selectedIds,
        today,
        options: { ...toggles, myName: cleanMyName, theirName: cleanTheirName, openingBalance },
      }),
    [entries, selectedIds, today, toggles, cleanMyName, cleanTheirName, openingBalance],
  );
  const title = headerLine(cleanMyName, cleanTheirName);

  // --- actions -------------------------------------------------------------
  const copy = useCallback(async () => {
    if (openingError) return;
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      notify('Ledger copied', 'success');
    } catch {
      notify("Couldn't copy the ledger. Select the preview text and copy it manually.", 'danger');
    }
  }, [text, notify, openingError]);

  const share = useCallback(async () => {
    if (openingError) return;
    try {
      await navigator.share({ title, text });
    } catch (err) {
      // The user closed the share sheet: not an error, nothing to fall back to.
      if ((err as { name?: string } | null)?.name === 'AbortError') return;
      await copy();
    }
  }, [title, text, copy, openingError]);

  return {
    entries,
    selectedIds,
    toggleEntry,
    selectAll,
    selectNone,
    selectSinceSettled,
    sinceSettledAvailable,
    allSelected,
    noneSelected,
    sinceSettledSelected,
    myName,
    setMyName,
    theirName: theirNameInput,
    setTheirName: setTheirNameInput,
    cleanMyName,
    cleanTheirName,
    openingAmount: opening.amount,
    openingTheyOwe: opening.theyOwe,
    openingIsDerived,
    openingIncluded: openingBalance !== null,
    openingError,
    setOpeningAmount,
    setOpeningTheyOwe,
    clearOpening,
    resetOpening,
    toggles,
    setToggle,
    text,
    title,
    canShare,
    copy,
    share,
  };
}

export type ExportLedgerState = ReturnType<typeof useExportLedger>;

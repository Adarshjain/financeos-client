// The Dinero registry of built-in dashboard widgets, keyed by builtinKey: the two group maps in one. A component
// built-in has a `Body` (it fetches its own data); a template built-in has a `View` the frame feeds with the loaded
// report data (the server's `view` name only picks the Legacy renderer, so views are looked up by key here).

import type { ComponentType } from 'react';

import { CARDS_SPENDING_BUILTINS } from './group.cardsSpending';
import { INVESTMENTS_LOANS_BUILTINS } from './group.investmentsLoans';
import { ShortcutsParamsEditor } from './shortcuts/ShortcutsParamsEditor';
import type { BuiltinParamsEditorProps, DineroBuiltin } from './types';

export const BUILTIN_REGISTRY: Readonly<Record<string, DineroBuiltin>> = {
  ...CARDS_SPENDING_BUILTINS,
  ...INVESTMENTS_LOANS_BUILTINS,
};

/** The pieces for a built-in key, or null when the client has none (the frame then shows "no longer available"). */
export function builtinPieces(key: string | null | undefined): DineroBuiltin | null {
  if (!key || !Object.hasOwn(BUILTIN_REGISTRY, key)) return null;
  return BUILTIN_REGISTRY[key];
}

/** The params editors of built-ins whose list params the generic form can't edit (the shortcuts list). */
const PARAMS_EDITORS: Readonly<Record<string, ComponentType<BuiltinParamsEditorProps>>> = {
  shortcuts: ShortcutsParamsEditor,
};

/** The params editor for a built-in key, or null when the generic form handles it. */
export function builtinParamsEditor(key: string | null | undefined): ComponentType<BuiltinParamsEditorProps> | null {
  if (!key || !Object.hasOwn(PARAMS_EDITORS, key)) return null;
  return PARAMS_EDITORS[key];
}

export function builtinHasParamsEditor(key: string | null | undefined): boolean {
  return builtinParamsEditor(key) != null;
}

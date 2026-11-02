import type { SelectOption } from './Select';

export type NestedState = boolean | 'indeterminate';

/** Every option, children after their parent. */
export function flattenOptions(options: readonly SelectOption[]): SelectOption[] {
  return options.flatMap((o) => [o, ...(o.children ?? [])]);
}

const childValues = (parent: SelectOption) => (parent.children ?? []).map((c) => c.value);

/** Checked when the parent's value is picked, indeterminate when only some of its children are. */
export function parentState(value: readonly string[], parent: SelectOption): NestedState {
  if (value.includes(parent.value)) return true;
  return childValues(parent).some((v) => value.includes(v)) ? 'indeterminate' : false;
}

/** A child shows ticked on its own pick, or because its parent is picked whole. */
export function childChecked(value: readonly string[], parent: SelectOption, childValue: string): boolean {
  return value.includes(parent.value) || value.includes(childValue);
}

/**
 * Flips one value in the flat list. A parent that is checked or partly picked goes with all its children, otherwise it is added
 * and its children are dropped. A child of a picked parent splits the parent into its other children; picking every child
 * folds them back into the parent; unpicking the last child leaves none.
 */
export function toggleNested(value: readonly string[], options: readonly SelectOption[], target: string): string[] {
  const parent = options.find((o) => o.value === target && (o.children?.length ?? 0) > 0);
  if (parent) {
    const kids = childValues(parent);
    const rest = value.filter((v) => v !== parent.value && !kids.includes(v));
    return parentState(value, parent) !== false ? rest : [...rest, parent.value];
  }
  const owner = options.find((o) => o.children?.some((c) => c.value === target));
  if (!owner) return value.includes(target) ? value.filter((v) => v !== target) : [...value, target];
  const kids = childValues(owner);
  const now = value.includes(owner.value) ? kids : kids.filter((k) => value.includes(k));
  const next = now.includes(target) ? now.filter((k) => k !== target) : [...now, target];
  const rest = value.filter((v) => v !== owner.value && !kids.includes(v));
  if (next.length === kids.length) return [...rest, owner.value];
  return [...rest, ...kids.filter((k) => next.includes(k))];
}

/** Parents with some children picked (and not picked whole): the ones shown expanded when the list opens. */
export function initiallyExpanded(value: readonly string[], options: readonly SelectOption[]): string[] {
  return options.filter((o) => parentState(value, o) === 'indeterminate').map((o) => o.value);
}

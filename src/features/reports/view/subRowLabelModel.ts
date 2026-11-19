// How a breakdown's sub-row label reads under its parent row. Display only: the raw label stays the one
// that drill-down and requests use.

const SEPARATOR = ' · ';

/** A sub-row label without its leading "<parent label> · "; unchanged when it has no such prefix or nothing would be left. */
export function subRowDisplayLabel(parentLabel: string, subLabel: string): string {
  const prefix = `${parentLabel}${SEPARATOR}`;
  if (!subLabel.startsWith(prefix)) return subLabel;
  const rest = subLabel.slice(prefix.length);
  return rest === '' ? subLabel : rest;
}

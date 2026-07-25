/**
 * Typed readers for FormData.
 *
 * `FormData.get` returns `string | File | null`, and a present-but-empty input
 * yields `''`, not `null`. That breaks the two idioms this codebase used:
 *
 *   formData.get(k) as string ?? undefined   // `??` ignores '', so '' is sent
 *   parseInt(formData.get(k) as string)      // parseInt('') is NaN, and
 *                                            // JSON.stringify(NaN) is `null`
 *
 * These helpers collapse both "absent" and "blank" to `undefined` so the field
 * is omitted from the payload instead of being sent as `''` or `null`.
 */

function rawString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Absent, blank, or non-string → `undefined`. */
export function optionalString(formData: FormData, key: string): string | undefined {
  return rawString(formData, key);
}

/**
 * A decimal (money) field. Uses `Number` rather than `parseFloat` so partial
 * garbage like `'12abc'` is rejected outright instead of silently becoming 12.
 */
export function optionalDecimal(formData: FormData, key: string): number | undefined {
  const raw = rawString(formData, key);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** A whole-number field (day-of-month, day counts) — never money. */
export function optionalInteger(formData: FormData, key: string): number | undefined {
  const parsed = optionalDecimal(formData, key);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

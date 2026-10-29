/** `?installment=N` from an EMI push deep link; anything that is not a positive integer is ignored. */
export function parseInstallmentParam(raw: string | string[] | null | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

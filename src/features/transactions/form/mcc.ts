/** True for an empty MCC or exactly four digits. */
export function isValidMcc(mcc?: string | null): boolean {
  if (!mcc || mcc.trim() === '') return true;
  return /^\d{4}$/.test(mcc.trim());
}

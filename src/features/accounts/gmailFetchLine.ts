/** "Fetching older emails · 8 of 12 months" while older mail is being fetched; null otherwise. */
export function gmailFetchLine(
  progress: { monthsDone: number; monthsTotal: number } | null | undefined
): string | null {
  if (!progress) return null;
  return `Fetching older emails · ${progress.monthsDone} of ${progress.monthsTotal} months`;
}

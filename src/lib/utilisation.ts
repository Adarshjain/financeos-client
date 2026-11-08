// The one colour scale for credit utilisation (owed ÷ limit, in percent),
// shared by every surface that shows it: under 30% is healthy (low),
// 30–70% is watched (medium), 70% and over is high. Banks and bureaus
// start to notice above 30%.

export type UtilisationTone = 'low' | 'medium' | 'high';

/** Lower bound (inclusive) of the amber band. */
export const UTILISATION_WATCH_PCT = 30;
/** Lower bound (inclusive) of the rose band. */
export const UTILISATION_HIGH_PCT = 70;

/** The band for a utilisation percent; a missing or non-finite percent counts as none used. */
export function utilisationTone(pct: number | null | undefined): UtilisationTone {
  if (pct == null || !Number.isFinite(pct)) return 'low';
  if (pct >= UTILISATION_HIGH_PCT) return 'high';
  if (pct >= UTILISATION_WATCH_PCT) return 'medium';
  return 'low';
}

// The one colour scale for credit utilisation (owed ÷ limit, in percent),
// shared by every surface that shows it: under 30% is healthy (emerald),
// 30–70% is watched (amber), 70% and over is high (rose). Banks and bureaus
// start to notice above 30%.

export type UtilisationTone = 'low' | 'medium' | 'high';

export interface UtilisationToneClasses {
  tone: UtilisationTone;
  /** Fill of a progress bar. */
  bar: string;
  /** The percentage figure. */
  text: string;
}

/** Lower bound (inclusive) of the amber band. */
export const UTILISATION_WATCH_PCT = 30;
/** Lower bound (inclusive) of the rose band. */
export const UTILISATION_HIGH_PCT = 70;

const CLASSES: Record<UtilisationTone, UtilisationToneClasses> = {
  low: { tone: 'low', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  medium: { tone: 'medium', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  high: { tone: 'high', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
};

/** The band for a utilisation percent; a missing or non-finite percent counts as none used. */
export function utilisationTone(pct: number | null | undefined): UtilisationTone {
  if (pct == null || !Number.isFinite(pct)) return 'low';
  if (pct >= UTILISATION_HIGH_PCT) return 'high';
  if (pct >= UTILISATION_WATCH_PCT) return 'medium';
  return 'low';
}

/** Bar and text classes for a utilisation percent. */
export function utilisationToneClasses(pct: number | null | undefined): UtilisationToneClasses {
  return CLASSES[utilisationTone(pct)];
}

/** A bar's width for a percent: clamped to 0–100. */
export function utilisationBarWidth(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '0%';
  return `${Math.min(100, Math.max(0, pct))}%`;
}

/** A utilisation percent for display, one decimal ("46.0%"); an em dash when unknown (no limit). */
export function formatUtilisation(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '—';
  return `${pct.toFixed(1)}%`;
}

/** The stored birth date is "yyyy-MM-dd", or "--MM-dd" when the year is unknown. */
const FULL = /^(\d{4})-(\d{2})-(\d{2})$/;
const PARTIAL = /^--(\d{2})-(\d{2})$/;

/** Reads as dd/mm/yyyy ("dd/mm" when the year is unknown); empty for no date. */
export function formatBirthDate(stored: string | null | undefined): string {
  if (!stored) return '';
  const full = FULL.exec(stored);
  if (full) return `${full[3]}/${full[2]}/${full[1]}`;
  const partial = PARTIAL.exec(stored);
  return partial ? `${partial[2]}/${partial[1]}` : '';
}

/** The value for a date field: the full date, or '' (a partial date can't be shown in the field). */
export function birthDateFieldValue(stored: string | null | undefined): string {
  return stored && FULL.test(stored) ? stored : '';
}

/** True for a stored date without a year. */
export function isPartialBirthDate(stored: string | null | undefined): boolean {
  return Boolean(stored && PARTIAL.test(stored));
}

export const NAME_CAPTION_GOOGLE = 'From your Google account. Change it if your bank prints it differently.';
export const BIRTH_CAPTION_GOOGLE = 'From your Google account';
export const NAME_LABEL = 'Your name, as your bank prints it';
export const BIRTH_LABEL = 'Date of birth';
export const MAX_NAME_LENGTH = 120;

/** What the Hello screen's Continue press does, and what the form shows, from the values alone. */
export interface HelloInput {
  name: string;
  birthDate: string;
  consent: boolean;
  /** An earlier press found name or birth date empty and showed the warnings. */
  warned: boolean;
  /** Gmail is already connected: Hello is the only screen. */
  onlyScreen: boolean;
}

export const NAME_WARNING =
  "Without it we can't open statements your bank locks with your name. We'll still find your accounts from emails.";
export const BIRTH_WARNING =
  "Without it we can't open statements your bank locks with it. We'll still find your accounts from emails, but card names and limits may stay empty.";
export const CONSENT_ERROR = 'Tick this to continue.';

export function missingFields(input: Pick<HelloInput, 'name' | 'birthDate'>) {
  return { name: input.name.trim() === '', birthDate: input.birthDate === '' };
}

/** Warnings show once Continue was pressed with something empty, and go as each field gets filled. */
export function helloView(input: HelloInput) {
  const missing = missingFields(input);
  const nameWarning = input.warned && missing.name;
  const birthWarning = input.warned && missing.birthDate;
  const label = nameWarning || birthWarning ? 'Continue anyway' : input.onlyScreen ? "Let's go" : 'Continue';
  return { nameWarning, birthWarning, label };
}

/** First press with an empty field warns (and never submits); consent is always required. */
export function pressOutcome(input: HelloInput): 'warn' | 'consent' | 'submit' {
  const missing = missingFields(input);
  if (!input.warned && (missing.name || missing.birthDate)) return 'warn';
  return input.consent ? 'submit' : 'consent';
}

export function stepCounterVisible(hasGmail: boolean): boolean {
  return !hasGmail;
}

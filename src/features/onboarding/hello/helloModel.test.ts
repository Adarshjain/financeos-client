import { describe, expect, it } from 'vitest';

import { BIRTH_WARNING, helloView, NAME_WARNING, pressOutcome, startStep, stepCounterVisible } from './helloModel';

const base = { name: 'Asha Rao', birthDate: '1990-04-05', consent: true, warned: false, onlyScreen: false };

describe('helloView', () => {
  it('reads Continue with nothing warned, and Let\'s go when Hello is the only screen', () => {
    expect(helloView(base).label).toBe('Continue');
    expect(helloView({ ...base, onlyScreen: true }).label).toBe("Let's go");
  });

  it('warns only the empty fields once warned, and reads Continue anyway', () => {
    const view = helloView({ ...base, birthDate: '', warned: true });
    expect(view).toMatchObject({ nameWarning: false, birthWarning: true, label: 'Continue anyway' });
    expect(helloView({ ...base, name: '  ', birthDate: '', warned: true })).toMatchObject({
      nameWarning: true,
      birthWarning: true,
    });
  });

  it('goes back to Continue when every field is filled', () => {
    expect(helloView({ ...base, warned: true }).label).toBe('Continue');
    expect(helloView({ ...base, warned: true, onlyScreen: true }).label).toBe("Let's go");
  });

  it('never warns before the first press', () => {
    expect(helloView({ ...base, name: '', birthDate: '' })).toMatchObject({ nameWarning: false, birthWarning: false });
  });

  it('keeps the warning copy', () => {
    expect(NAME_WARNING).toContain('your bank locks with your name');
    expect(BIRTH_WARNING).toContain('card names and limits may stay empty');
  });
});

describe('pressOutcome', () => {
  it('warns first when a field is empty, then proceeds on the second press', () => {
    expect(pressOutcome({ ...base, birthDate: '' })).toBe('warn');
    expect(pressOutcome({ ...base, birthDate: '', warned: true })).toBe('submit');
  });

  it('always needs consent', () => {
    expect(pressOutcome({ ...base, consent: false })).toBe('consent');
    expect(pressOutcome({ ...base, birthDate: '', warned: true, consent: false })).toBe('consent');
  });

  it('submits when everything is filled', () => {
    expect(pressOutcome(base)).toBe('submit');
  });
});

describe('stepCounterVisible', () => {
  it('shows only when Connect Gmail will follow', () => {
    expect(stepCounterVisible(false)).toBe(true);
    expect(stepCounterVisible(true)).toBe(false);
  });
});

describe('startStep', () => {
  it('resumes on step 2 only when step 1 is saved and Gmail is not connected', () => {
    expect(startStep(true, false)).toBe(2);
    expect(startStep(false, false)).toBe(1);
    expect(startStep(true, true)).toBe(1);
    expect(startStep(false, true)).toBe(1);
  });
});

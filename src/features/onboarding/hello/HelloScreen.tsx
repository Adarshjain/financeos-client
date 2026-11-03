'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { DateField } from '@/components/ds/DateField/DateField';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { appHref } from '@/features/shell/routes';

import {
  BIRTH_CAPTION_GOOGLE,
  BIRTH_LABEL,
  birthDateFieldValue,
  isPartialBirthDate,
  MAX_NAME_LENGTH,
  NAME_CAPTION_GOOGLE,
  NAME_LABEL,
} from '../birthDate';
import { startGmailOAuthToHome, submitHello } from './helloActions';
import { BIRTH_WARNING, CONSENT_ERROR, helloView, NAME_WARNING, pressOutcome, stepCounterVisible } from './helloModel';

export interface HelloScreenProps {
  displayName: string | null;
  /** The name came from the Google account (no password on the account). */
  nameFromGoogle: boolean;
  birthDate: string | null;
  birthDateFromGoogle: boolean;
  hasGmail: boolean;
  today: string;
}

function firstName(displayName: string | null): string | null {
  return displayName?.trim().split(/\s+/)[0] || null;
}

/** The one-time Hello (name, birth date, consent), then Connect Gmail when no mailbox is connected yet. */
export function HelloScreen({
  displayName,
  nameFromGoogle,
  birthDate,
  birthDateFromGoogle,
  hasGmail,
  today,
}: HelloScreenProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(displayName ?? '');
  const [birth, setBirth] = useState(birthDateFieldValue(birthDate));
  const [consent, setConsent] = useState(false);
  const [warned, setWarned] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counter = stepCounterVisible(hasGmail);
  const view = helloView({ name, birthDate: birth, consent, warned, onlyScreen: hasGmail });
  const home = () => router.replace(appHref('/dashboard'));

  const submit = async () => {
    setError(null);
    const outcome = pressOutcome({ name, birthDate: birth, consent, warned, onlyScreen: hasGmail });
    if (outcome === 'warn') {
      setWarned(true);
      setConsentError(!consent);
      return;
    }
    if (outcome === 'consent') {
      setConsentError(true);
      return;
    }
    setSaving(true);
    const keepsPartial = birth === '' && isPartialBirthDate(birthDate);
    const result = await submitHello({
      displayName: name.trim() || undefined,
      birthDate: birth || (keepsPartial ? undefined : ''),
    });
    if (!result.success) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    if (hasGmail) {
      home();
      return;
    }
    setSaving(false);
    setStep(2);
  };

  const connect = async () => {
    setConnecting(true);
    setError(null);
    const result = await startGmailOAuthToHome();
    if (result.success && result.data?.authorizationUrl) {
      window.location.href = result.data.authorizationUrl;
    } else {
      setError(result.success ? "Couldn't connect Gmail. Try again." : result.error.message);
      setConnecting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-dvh flex items-start desk:items-center justify-center px-space-20 pt-space-24 pb-space-20 desk:p-space-40">
      <div className="w-full max-w-md flex flex-col gap-space-16">{children}</div>
    </div>
  );

  if (step === 2) {
    return shell(
      <>
        <div className="flex flex-col gap-space-4">
          <Text variant="caption" tone="ink-3">
            2 of 2
          </Text>
          <Text as="h1" variant="page-title" family="display">
            Connect the Gmail your bank writes to
          </Text>
          <Text variant="body" tone="ink-3">
            That&apos;s where your cards and accounts are hiding.
          </Text>
        </div>
        <div className="flex flex-col gap-space-8">
          <Text variant="body">We find your bank accounts and cards from bank emails, so you don&apos;t type them in.</Text>
          <Text variant="body">We read only bank and card mail. Read-only: we never send or delete.</Text>
          <Text variant="body">New statements and spends come in on their own after that.</Text>
        </div>
        <Text variant="caption" tone="ink-3">
          Google will say FinanceOS wants to &quot;read your email&quot;. Untick nothing on that screen, or we can&apos;t find
          your accounts.
        </Text>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <div className="flex gap-space-8">
          <Button variant="secondary" size="xl" disabled={connecting} onClick={home}>
            Skip
          </Button>
          <Button
            variant="primary"
            size="xl"
            className="flex-1"
            loading={connecting}
            loadingLabel="Opening Google…"
            onClick={connect}
          >
            Connect Gmail
          </Button>
        </div>
      </>,
    );
  }

  const first = firstName(displayName);
  return shell(
    <>
      <div className="flex flex-col gap-space-4">
        {counter ? (
          <Text variant="caption" tone="ink-3">
            1 of 2
          </Text>
        ) : null}
        <Text as="h1" variant="page-title" family="display">
          {first ? `Hi ${first}. Let's find all your money.` : "Hi there. Let's find all your money."}
        </Text>
        <Text variant="body" tone="ink-3">
          One minute. We&apos;ll find your cards and accounts from your bank emails.
        </Text>
      </div>

      <form
        noValidate
        className="flex flex-col gap-space-16"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField
          id="hello-name"
          label={NAME_LABEL}
          name="displayName"
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onValueChange={setName}
          disabled={saving}
          helper={
            view.nameWarning ? (
              <Text as="span" variant="caption" tone="warning">
                {NAME_WARNING}
              </Text>
            ) : nameFromGoogle ? (
              NAME_CAPTION_GOOGLE
            ) : undefined
          }
        />

        <div className="flex flex-col gap-space-4">
          <DateField
            id="hello-birth"
            label={BIRTH_LABEL}
            today={today}
            minDate="1900-01-01"
            maxDate={today}
            value={birth}
            onValueChange={(v) => setBirth(typeof v === 'string' ? v : '')}
            disabled={saving}
            helper={
              view.birthWarning ? (
                <Text as="span" variant="caption" tone="warning">
                  {BIRTH_WARNING}
                </Text>
              ) : birthDateFromGoogle && birth ? (
                BIRTH_CAPTION_GOOGLE
              ) : undefined
            }
          />
        </div>

        <Text variant="caption" tone="ink-3">
          Banks lock statement PDFs with a password made from your name and birth date. We use these only to open your
          statements. You can change them later in Settings.
        </Text>

        <div className="flex flex-col gap-space-4">
          <label className="flex items-start gap-space-8 cursor-pointer">
            <Checkbox
              className="mt-space-2"
              checked={consent}
              onCheckedChange={(c) => {
                setConsent(c === true);
                if (c === true) setConsentError(false);
              }}
              disabled={saving}
            />
            <Text variant="body">
              I agree to the Terms and Privacy policy. FinanceOS only reads; it never moves money or sends email.
            </Text>
          </label>
          {consentError ? (
            <Text variant="caption" tone="danger">
              {CONSENT_ERROR}
            </Text>
          ) : null}
        </div>

        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Button type="submit" variant="primary" size="xl" fullWidth loading={saving} loadingLabel="Saving…">
          {view.label}
        </Button>
      </form>
    </>,
  );
}

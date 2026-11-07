'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { DateField } from '@/components/ds/DateField/DateField';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Highlight } from '@/components/ds/Highlight/Highlight';
import { PageFooter } from '@/components/ds/PageFooter/PageFooter';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { StepList } from '@/components/ds/StepList/StepList';
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
import { finishHello, startGmailOAuthToHome, submitHello } from './helloActions';
import {
  BIRTH_WARNING,
  CONSENT_ERROR,
  helloView,
  NAME_WARNING,
  pressOutcome,
  SKIP_DIALOG_BODY,
  SKIP_DIALOG_TITLE,
  startStep,
  stepCounterVisible,
} from './helloModel';

export interface HelloScreenProps {
  displayName: string | null;
  /** The name came from the Google account (no password on the account). */
  nameFromGoogle: boolean;
  birthDate: string | null;
  birthDateFromGoogle: boolean;
  hasGmail: boolean;
  /** Step 1 is already saved (terms accepted) but onboarding is open: resume on step 2. */
  helloProfileSaved?: boolean;
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
  helloProfileSaved = false,
  today,
}: HelloScreenProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(startStep(helloProfileSaved, hasGmail));
  const [name, setName] = useState(displayName ?? '');
  const [birth, setBirth] = useState(birthDateFieldValue(birthDate));
  const [consent, setConsent] = useState(helloProfileSaved);
  const [warned, setWarned] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const view = helloView({
    name,
    birthDate: birth,
    consent,
    warned,
    onlyScreen: hasGmail,
  });
  const home = () => router.replace(appHref('/home'));

  const submit = async () => {
    setError(null);
    const outcome = pressOutcome({
      name,
      birthDate: birth,
      consent,
      warned,
      onlyScreen: hasGmail,
    });
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
      // Two steps: onboarding finishes at Skip or a connected Gmail. One step: this is the end.
      finish: hasGmail ? undefined : false,
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

  const skip = async () => {
    setSkipping(true);
    setError(null);
    const result = await finishHello();
    if (!result.success) {
      setSkipOpen(false);
      setError(result.error.message);
      setSkipping(false);
      return;
    }
    home();
  };

  const connect = async () => {
    setSkipOpen(false);
    setConnecting(true);
    setError(null);
    const result = await startGmailOAuthToHome();
    if (result.success && result.data?.authorizationUrl) {
      window.location.href = result.data.authorizationUrl;
    } else {
      setError(
        result.success
          ? "Couldn't connect Gmail. Try again."
          : result.error.message
      );
      setConnecting(false);
    }
  };

  const twoSteps = stepCounterVisible(hasGmail);

  // Top row, body, then the footer pinned to the bottom on a phone; a centred column on desktop.
  const shell = (
    top: { counter: string; progress: number } | null,
    body: React.ReactNode,
    footer: React.ReactNode
  ) => (
    <div className="min-h-dvh flex flex-col desk:items-center desk:justify-center desk:p-space-40">
      <div className="w-full flex-1 desk:flex-none desk:max-w-container-md flex flex-col px-space-16 pt-space-16">
        {top ? (
          <div className="flex items-center gap-space-10 pb-space-8">
            <ProgressBar className="flex-1" value={top.progress} />
            <Text variant="caption" tone="ink-3">
              {top.counter}
            </Text>
          </div>
        ) : null}
        <div className="flex flex-col gap-space-12 pt-space-12 pb-space-16">
          {body}
        </div>
        {footer}
      </div>
    </div>
  );

  const headline = (before: string, marked: string, after: string) => (
    <Text as="h1" variant="hero-figure" family="display">
      {before}
      <Highlight text={marked} query={marked} />
      {after}
    </Text>
  );

  if (step === 2) {
    return shell(
      { counter: '2 of 2', progress: 100 },
      <>
        <Dialog open={skipOpen} onOpenChange={(o) => !skipping && setSkipOpen(o)}>
          <Dialog.Content
            size="sm"
            title={SKIP_DIALOG_TITLE}
            secondary={{ label: 'Skip for now', onSelect: skip, loading: skipping }}
            primary={{ label: 'Connect Gmail', onSelect: connect, disabled: skipping }}
          >
            <Dialog.Body>
              <Text variant="body" tone="ink-2">
                {SKIP_DIALOG_BODY}
              </Text>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog>
        <div className="flex flex-col gap-space-8">
          {headline('Connect the Gmail your ', 'bank', ' writes to')}
          <Text variant="body" tone="ink-3">
            That&apos;s where your cards and accounts are hiding.
          </Text>
        </div>
        <StepList
          variant="live"
          steps={[
            {
              id: 'find',
              state: 'done',
              label:
                "We find your bank accounts and cards from bank emails, so you don't type them in.",
            },
            {
              id: 'read',
              state: 'done',
              label:
                'We read only bank and card mail. Read-only: we never send or delete.',
            },
            {
              id: 'sync',
              state: 'done',
              label:
                'New statements and spends come in on their own after that.',
            },
          ]}
        />
        <Banner tone="neutral">
          Google will say FinanceOS wants to &quot;read your email&quot;. Untick
          nothing on that screen, or we can&apos;t find your accounts.
        </Banner>
        {error ? <Banner tone="danger">{error}</Banner> : null}
      </>,
      <PageFooter
        sticky
        variant="plain"
        tertiary={{ label: 'Back', onSelect: () => setStep(1), disabled: connecting || skipping }}
        secondary={{ label: 'Skip', onSelect: () => setSkipOpen(true), disabled: connecting }}
        primary={{
          label: connecting ? 'Opening Google…' : 'Connect Gmail',
          loading: connecting,
          disabled: skipping,
          onSelect: connect,
        }}
      />
    );
  }

  const first = firstName(displayName);
  return shell(
    twoSteps ? { counter: '1 of 2', progress: 50 } : null,
    <>
      <div className="flex flex-col gap-space-8">
        {headline(`Hi ${first ?? 'there'}. Let's find `, 'all', ' your money.')}
        <Text variant="body" tone="ink-3">
          One minute. We&apos;ll find your cards and accounts from your bank
          emails.
        </Text>
      </div>

      <form
        id="hello-form"
        noValidate
        className="flex flex-col gap-space-12"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <TextField
          id="hello-name"
          size="xl"
          textStyle="regular"
          label={NAME_LABEL}
          placeholder="Your full name"
          name="displayName"
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onValueChange={setName}
          disabled={saving}
          warning={view.nameWarning ? NAME_WARNING : undefined}
          helper={nameFromGoogle ? NAME_CAPTION_GOOGLE : undefined}
        />

        <DateField
          id="hello-birth"
          size="xl"
          textStyle="regular"
          label={BIRTH_LABEL}
          today={today}
          minDate="1900-01-01"
          maxDate={today}
          value={birth}
          onValueChange={(v) => setBirth(typeof v === 'string' ? v : '')}
          disabled={saving}
          warning={view.birthWarning ? BIRTH_WARNING : undefined}
          helper={birthDateFromGoogle && birth ? BIRTH_CAPTION_GOOGLE : undefined}
        />

        <Banner tone="neutral">
          Banks lock statement PDFs with a password made from your name and
          birth date. We use these only to open your statements. You can change
          them later in Settings.
        </Banner>

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
              I agree to the Terms and Privacy policy. FinanceOS only reads; it
              never moves money or sends email.
            </Text>
          </label>
          {consentError ? (
            <Text variant="caption" tone="danger">
              {CONSENT_ERROR}
            </Text>
          ) : null}
        </div>

        {error ? <Banner tone="danger">{error}</Banner> : null}
      </form>
    </>,
    <PageFooter
      sticky
      variant="plain"
      primary={{
        label: saving ? 'Saving…' : view.label,
        type: 'submit',
        form: 'hello-form',
        loading: saving,
      }}
    />
  );
}

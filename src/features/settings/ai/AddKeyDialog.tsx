'use client';

import React from 'react';

import { Banner, Button, Dialog, DialogBody, DialogContent, Select, TextField } from '@/components/ds';

import { PROVIDERS } from './providers';

const FORM_ID = 'add-llm-key-form';

interface AddKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  onProviderChange: (id: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  label: string;
  onLabelChange: (value: string) => void;
  submitting: boolean;
  error: string | null;
  /** The provider's free tier may train on prompts. */
  trainingWarning: boolean | undefined;
  onSubmit: () => void;
}

/** Add an API key: provider, the key, an optional label, and the training disclosure when it applies. */
export function AddKeyDialog(p: AddKeyDialogProps) {
  const provider = PROVIDERS.find((x) => x.id === p.providerId) ?? PROVIDERS[0];

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent
        size="md"
        dismissible={!p.submitting}
        title="Add key"
        secondary={{ label: 'Cancel', disabled: p.submitting, onSelect: () => p.onOpenChange(false) }}
        primary={{
          label: 'Add key',
          type: 'submit',
          form: FORM_ID,
          loading: p.submitting,
          disabled: p.submitting || !p.apiKey.trim(),
        }}
      >
        <DialogBody>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-8 desk:gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              p.onSubmit();
            }}
          >
            {p.error ? <Banner tone="danger">{p.error}</Banner> : null}
            {p.trainingWarning ? (
              <Banner tone="warning" title="Training & privacy disclosure">
                Financial data sent to this provider&apos;s free tier may be used by the provider to train AI models. Paid
                tiers do not train on customer prompts.
              </Banner>
            ) : null}
            <Select
              label="Provider"
              value={p.providerId}
              onValueChange={(v) => p.onProviderChange(v as string)}
              options={PROVIDERS.map((x) => ({ value: x.id, label: x.name }))}
            />
            <TextField
              label="API key"
              name="llm_key_secret_input"
              type="password"
              placeholder="Paste API key"
              value={p.apiKey}
              onChange={(e) => p.onApiKeyChange(e.target.value)}
              required
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              helper={
                <>
                  Get key from{' '}
                  <Button variant="link" asChild>
                    <a href={provider.getKeyUrl} target="_blank" rel="noreferrer">
                      {provider.name}
                    </a>
                  </Button>
                </>
              }
            />
            <TextField
              label="Label"
              optional
              name="llm_key_label_input"
              placeholder="e.g. Project Alpha"
              value={p.label}
              onChange={(e) => p.onLabelChange(e.target.value)}
              autoComplete="off"
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

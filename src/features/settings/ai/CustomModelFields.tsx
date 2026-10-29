'use client';

import React, { useState } from 'react';

import { Button, Select, Text, TextField } from '@/components/ds';

import type { ProviderOption } from './providersModel';
import type { CustomModelInput } from './useLlmRoutingEditor';

interface CustomModelFieldsProps {
  providers: ProviderOption[];
  testing: boolean;
  error: string | null;
  /** Resolves true when the server accepted the model and it was added to the draft. */
  onAdd: (input: CustomModelInput) => Promise<boolean>;
}

const DEFAULT = '__default__';
const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high'];
const STRUCTURED = ['json-schema', 'json-object'];

/**
 * The bottom of a routing draft: pick a provider you hold a key for, type a model id, and "Test & add"
 * probes it with that key before it joins the list. The knobs under "More options" are sent with every
 * call to this model.
 */
export function CustomModelFields({ providers, testing, error, onAdd }: CustomModelFieldsProps) {
  const keyed = providers.filter((p) => p.hasKey);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [effort, setEffort] = useState(DEFAULT);
  const [structured, setStructured] = useState(DEFAULT);
  const [maxTokens, setMaxTokens] = useState('');
  const [pin, setPin] = useState('');
  const [showMore, setShowMore] = useState(false);

  const effectiveProvider = keyed.some((p) => p.id === provider) ? provider : (keyed[0]?.id ?? '');
  const canSubmit = !testing && effectiveProvider !== '' && model.trim() !== '';

  const submit = async () => {
    if (!canSubmit) return;
    const parsedMax = maxTokens.trim() === '' ? NaN : Number(maxTokens);
    const ok = await onAdd({
      provider: effectiveProvider,
      model: model.trim(),
      reasoningEffort: effort === DEFAULT ? null : effort,
      structuredOutput: structured === DEFAULT ? null : structured,
      maxOutputTokens: Number.isInteger(parsedMax) && parsedMax > 0 ? parsedMax : null,
      providerPin: pin.trim() || null,
    });
    if (ok) {
      setModel('');
      setMaxTokens('');
      setPin('');
      setEffort(DEFAULT);
      setStructured(DEFAULT);
    }
  };

  if (keyed.length === 0) {
    return (
      <Text variant="label" tone="ink-3" as="p">
        Add an API key to type in a model of your own.
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-space-8">
      <div className="flex flex-col desk:flex-row gap-space-8 desk:items-end">
        <Select
          label="Provider"
          className="desk:w-40"
          value={effectiveProvider}
          onValueChange={(v) => setProvider(v as string)}
          options={keyed.map((p) => ({ value: p.id, label: p.name }))}
        />
        <TextField
          label="Model id"
          className="flex-1"
          placeholder="e.g. anthropic/claude-haiku-5.5"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <Button variant="secondary" disabled={!canSubmit} loading={testing} onClick={() => void submit()}>
          Test &amp; add
        </Button>
      </div>

      <div>
        <Button variant="link" onClick={() => setShowMore((v) => !v)}>
          {showMore ? 'Fewer options' : 'More options'}
        </Button>
      </div>

      {showMore ? (
        <div className="grid grid-cols-1 desk:grid-cols-2 gap-space-8">
          <Select
            label="Reasoning effort"
            value={effort}
            onValueChange={(v) => setEffort(v as string)}
            options={[
              { value: DEFAULT, label: 'Provider default' },
              ...EFFORTS.map((v) => ({ value: v, label: v })),
            ]}
          />
          <TextField
            label="Max output tokens"
            type="number"
            min={1}
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
          />
          <Select
            label="Structured output"
            value={structured}
            onValueChange={(v) => setStructured(v as string)}
            options={[
              { value: DEFAULT, label: 'Provider default' },
              ...STRUCTURED.map((v) => ({ value: v, label: v })),
            ]}
          />
          <TextField
            label="Provider pin"
            placeholder="OpenRouter upstream pin, e.g. anthropic"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </div>
      ) : null}

      {error ? (
        <Text variant="label" tone="danger" as="p">
          {error}
        </Text>
      ) : null}
    </div>
  );
}

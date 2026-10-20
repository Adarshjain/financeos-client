'use client';

import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProviderOption } from '@/features/settings/ai/providers';
import type { CustomModelInput } from '@/features/settings/ai/useLlmRoutingEditor';


interface CustomModelRowProps {
  providers: ProviderOption[];
  testing: boolean;
  error: string | null;
  /** Resolves true when the server accepted the model and it was added to the draft. */
  onAdd: (input: CustomModelInput) => Promise<boolean>;
}

const DEFAULT = '__default__';
const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high'];
const STRUCTURED = ['json-schema', 'json-object'];

const fieldClass = 'h-7 text-xs';

/**
 * The bottom row of a routing draft: pick a provider you hold a key for, type a model id, and
 * "Test & add" probes it with that key before it joins the list. The knobs under "More options"
 * are sent with every call to this model (reasoning effort, output cap, OpenRouter upstream pin,
 * structured-output mode) and live on the row, so tuning needs no deploy either.
 */
export function CustomModelRow({ providers, testing, error, onAdd }: CustomModelRowProps) {
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
      <p className="text-2xs text-slate-400 dark:text-slate-500 pt-1">
        Add an API key to type in a model of your own.
      </p>
    );
  }

  return (
    <div className="mt-1 rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-2 space-y-1.5">
      <div className="flex flex-col sm:flex-row gap-1.5">
        <Select value={effectiveProvider} onValueChange={setProvider}>
          <SelectTrigger className={`${fieldClass} sm:w-36`} aria-label="Provider">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            {keyed.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className={`${fieldClass} flex-1 font-mono`}
          aria-label="Model id"
          placeholder="Model id, e.g. anthropic/claude-haiku-5.5"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <Button variant="outline" size="xs" disabled={!canSubmit} onClick={() => void submit()}>
          {testing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
          Test &amp; add
        </Button>
      </div>

      <button
        type="button"
        className="text-2xs text-slate-500 dark:text-slate-400 underline-offset-2 hover:underline"
        onClick={() => setShowMore((v) => !v)}
      >
        {showMore ? 'Fewer options' : 'More options'}
      </button>

      {showMore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <Select value={effort} onValueChange={setEffort}>
            <SelectTrigger className={fieldClass} aria-label="Reasoning effort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT} className="text-xs">
                Reasoning effort: provider default
              </SelectItem>
              {EFFORTS.map((v) => (
                <SelectItem key={v} value={v} className="text-xs">
                  Reasoning effort: {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className={fieldClass}
            type="number"
            min={1}
            aria-label="Max output tokens"
            placeholder="Max output tokens"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
          />
          <Select value={structured} onValueChange={setStructured}>
            <SelectTrigger className={fieldClass} aria-label="Structured output">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT} className="text-xs">
                Structured output: provider default
              </SelectItem>
              {STRUCTURED.map((v) => (
                <SelectItem key={v} value={v} className="text-xs">
                  Structured output: {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className={`${fieldClass} font-mono`}
            aria-label="Provider pin"
            placeholder="OpenRouter upstream pin, e.g. anthropic"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </div>
      )}

      {error && <p className="text-2xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

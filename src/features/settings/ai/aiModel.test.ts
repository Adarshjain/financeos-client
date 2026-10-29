import { describe, expect, it } from 'vitest';

import type { LlmBucketHealthDto, LlmKeyDto, LlmRoutingDto, RoutingOptionDto } from '@/lib/api/types';

import { buildHealthRows, buildKeyRows, formatCooldownTime, formatLastUsed, providerLine, routingParts } from './aiModel';
import { buildProviderOptions, showTrainingWarning } from './providersModel';

const key = (over: Partial<LlmKeyDto>): LlmKeyDto => ({
  id: 'k1',
  createdAt: '2026-10-01T00:00:00Z',
  keyLast4: 'k3Qa',
  position: 1,
  provider: 'gemini',
  status: 'ACTIVE',
  ...over,
});

describe('formatLastUsed', () => {
  const today = '2026-10-20';
  it('says today, yesterday, else a date', () => {
    expect(formatLastUsed('2026-10-20T08:00:00Z', today)).toBe('today');
    expect(formatLastUsed('2026-10-19T08:00:00Z', today)).toBe('yesterday');
    expect(formatLastUsed('2026-10-17T08:00:00Z', today)).toBe('17 Oct');
    expect(formatLastUsed('2026-10-13T08:00:00Z', today)).toBe('13 Oct');
  });
  it('is a dash when never used', () => {
    expect(formatLastUsed(null, today)).toBe('—');
    expect(formatLastUsed(undefined, today)).toBe('—');
  });
  it('reads the day in the app zone', () => {
    // 20:00 UTC on the 19th is 01:30 IST on the 20th.
    expect(formatLastUsed('2026-10-19T20:00:00Z', today)).toBe('today');
  });
});

describe('formatCooldownTime', () => {
  it('is 12-hour in the app zone', () => {
    expect(formatCooldownTime('2026-10-20T08:50:00Z')).toBe('2:20 pm');
  });
});

describe('buildKeyRows', () => {
  it('orders by provider then position and adds a Not set row per keyless provider', () => {
    const rows = buildKeyRows([
      key({ id: 'o', provider: 'openrouter' }),
      key({ id: 'g2', position: 2, label: 'Backup' }),
      key({ id: 'g1', position: 1, label: 'Personal' }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(['g1', 'g2', 'not-set-groq', 'o']);
    expect(rows.find((r) => r.id === 'not-set-groq')?.key).toBeNull();
  });

  it('shows all three providers as Not set with no keys', () => {
    expect(buildKeyRows([]).map((r) => r.provider.name)).toEqual(['Gemini', 'Groq', 'OpenRouter']);
  });
});

describe('providerLine', () => {
  const rows = buildKeyRows([
    key({ id: 'g1', position: 1, label: 'Personal' }),
    key({ id: 'g2', position: 2 }),
    key({ id: 'o', provider: 'openrouter' }),
    key({ id: 'q', provider: 'groq', label: 'Work' }),
  ]);
  const line = (id: string) => providerLine(rows.find((r) => r.id === id)!);
  it('adds #position and label', () => {
    expect(line('g1')).toBe('Gemini · #1 Personal');
    expect(line('q')).toBe('Groq · #1 Work');
  });
  it('shows #position for a provider with several keys even without a label', () => {
    expect(line('g2')).toBe('Gemini · #2');
  });
  it('is the bare provider for a lone unlabelled key and for Not set', () => {
    expect(line('o')).toBe('OpenRouter');
  });
});

describe('buildHealthRows', () => {
  const bucket = (over: Partial<LlmBucketHealthDto>): LlmBucketHealthDto => ({
    consecutiveFailures: 0,
    inCooldown: false,
    keyLast4: 'k3Qa',
    model: 'gemini-3.5-flash-lite',
    modelLabel: 'Gemini 3.5 Flash Lite',
    provider: 'gemini',
    providerName: 'Gemini',
    ...over,
  });
  const options = [
    { id: 'groq-llama', label: 'Groq Llama', provider: 'groq', providerName: 'Groq', available: false },
    { id: 'gem', label: 'Gemini 3.5 Flash Lite', provider: 'gemini', providerName: 'Gemini', available: true },
  ] as RoutingOptionDto[];
  const routing = {
    chat: {
      entries: [
        { position: 1, optionId: 'custom', optionLabel: 'anthropic/claude-haiku-5.5', provider: 'openrouter', providerName: 'OpenRouter', model: 'anthropic/claude-haiku-5.5', hasKey: true, custom: true },
      ],
    },
    default: { entries: [] },
  } as unknown as LlmRoutingDto;

  it('maps ready, cooldown (with time) and no key; names the provider for custom models only', () => {
    const rows = buildHealthRows(
      [
        bucket({}),
        bucket({
          provider: 'openrouter',
          providerName: 'OpenRouter',
          model: 'anthropic/claude-haiku-5.5',
          modelLabel: 'Claude Haiku 5.5',
          keyLast4: '9f2c',
          inCooldown: true,
          cooldownUntil: '2026-10-20T08:50:00Z',
        }),
      ],
      options,
      routing
    );
    expect(rows.map((r) => [r.label, r.last4, r.providerName, r.status, r.cooldownTime])).toEqual([
      ['Gemini 3.5 Flash Lite', 'k3Qa', null, 'ready', null],
      ['Claude Haiku 5.5', '9f2c', 'OpenRouter', 'cooldown', '2:20 pm'],
      ['Groq Llama', null, null, 'no-key', null],
    ]);
  });

  it('lists a keyless custom model as No key with its provider', () => {
    const keyless = {
      chat: { entries: [{ ...routing.chat.entries[0], hasKey: false }] },
      default: { entries: [] },
    } as unknown as LlmRoutingDto;
    const rows = buildHealthRows([], [], keyless);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'no-key', providerName: 'OpenRouter' });
  });
});

describe('routingParts', () => {
  it('sorts by position and flags custom models', () => {
    const parts = routingParts([
      { position: 2, optionId: 'a', optionLabel: 'A', provider: 'gemini', providerName: 'Gemini', hasKey: true, custom: false },
      { position: 1, optionId: 'custom', optionLabel: 'x/y', provider: 'openrouter', providerName: 'OpenRouter', model: 'x/y', hasKey: true, custom: true },
    ]);
    expect(parts.map((p) => [p.position, p.label, p.custom])).toEqual([
      [1, 'x/y', true],
      [2, 'A', false],
    ]);
  });
});

describe('providers helpers', () => {
  it('marks a provider keyed only with an ACTIVE key', () => {
    const opts = buildProviderOptions([key({ provider: 'groq', status: 'INVALID' }), key({ id: 'x', provider: 'openrouter' })]);
    expect(opts.map((o) => [o.id, o.hasKey])).toEqual([
      ['gemini', false],
      ['groq', false],
      ['openrouter', true],
    ]);
  });

  it('warns when a free model trains on data or may', () => {
    const catalog = [
      { id: 'gemini', models: [{ free: true, trainsOnData: 'yes' }] },
      { id: 'groq', models: [{ free: true, trainsOnData: 'no' }, { free: false, trainsOnData: 'yes' }] },
      { id: 'openrouter', models: [{ free: true, trainsOnData: 'unknown' }] },
    ] as unknown as Parameters<typeof showTrainingWarning>[0];
    expect(showTrainingWarning(catalog, 'gemini')).toBe(true);
    expect(showTrainingWarning(catalog, 'groq')).toBe(false);
    expect(showTrainingWarning(catalog, 'openrouter')).toBe(true);
    expect(showTrainingWarning(catalog, 'nope')).toBeUndefined();
  });
});

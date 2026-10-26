import type { LlmBucketHealthDto, LlmKeyDto, LlmRoutingDto, RoutingOptionDto, Schemas } from '@/lib/api/types';
import { clock12 } from '@/lib/clock12';
import { todayInAppZone } from '@/lib/date-range';

import { type ProviderConfig, PROVIDERS } from './providers';

type RoutingEntryDto = Schemas['RoutingEntryDto'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayNumber(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** "today", "yesterday", "3 days ago" (under a week), else "13 Oct"; "—" when never used. */
export function formatLastUsed(iso: string | null | undefined, today: string = todayInAppZone()): string {
  if (!iso) return '—';
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '—';
  const day = todayInAppZone(when);
  const diff = dayNumber(today) - dayNumber(day);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff} days ago`;
  const [, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "3:30 pm" (12h) in the app zone. */
export function formatCooldownTime(iso: string): string {
  return clock12(new Date(iso));
}

export interface KeyRow {
  id: string;
  provider: ProviderConfig;
  /** Null for a provider without a key (the "Not set" row). */
  key: LlmKeyDto | null;
  /** 0-based place among this provider's keys. */
  index: number;
  /** How many keys this provider has. */
  count: number;
}

/** One row per key in provider order (Gemini, Groq, OpenRouter) and key position, plus a "Not set" row per keyless provider. */
export function buildKeyRows(keys: LlmKeyDto[]): KeyRow[] {
  return PROVIDERS.flatMap((provider): KeyRow[] => {
    const own = keys
      .filter((k) => k.provider.toLowerCase() === provider.id.toLowerCase())
      .sort((a, b) => a.position - b.position);
    if (own.length === 0) return [{ id: `not-set-${provider.id}`, provider, key: null, index: 0, count: 0 }];
    return own.map((key, index) => ({ id: key.id, provider, key, index, count: own.length }));
  });
}

/** "Gemini · #1 Personal": the provider, then #position and the label when the key has a label or its provider has several keys. */
export function providerLine(row: KeyRow): string {
  if (!row.key) return row.provider.name;
  const label = row.key.label?.trim();
  if (!label && row.count < 2) return row.provider.name;
  return `${row.provider.name} · #${row.key.position}${label ? ` ${label}` : ''}`;
}

export const maskedKey = (last4: string) => `•••• ${last4}`;

export type HealthStatus = 'ready' | 'no-key' | 'cooldown';

export interface HealthRow {
  id: string;
  label: string;
  /** Last four characters of the key the bucket runs on; none when there is no key. */
  last4: string | null;
  /** Shown for custom models only. */
  providerName: string | null;
  status: HealthStatus;
  cooldownTime: string | null;
}

const customId = (provider: string, model: string | null | undefined) =>
  `${provider.toLowerCase()}|${(model ?? '').toLowerCase()}`;

/**
 * Rows from the health buckets (models with a key), then the menu options and custom models without a
 * key ("No key"), which the health endpoint does not list.
 */
export function buildHealthRows(
  health: LlmBucketHealthDto[],
  options: RoutingOptionDto[],
  routing: LlmRoutingDto | null
): HealthRow[] {
  const customEntries: RoutingEntryDto[] = routing
    ? [...routing.chat.entries, ...routing.default.entries].filter((e) => e.custom)
    : [];
  const customKeys = new Set(customEntries.map((e) => customId(e.provider, e.model)));

  const rows: HealthRow[] = health.map((h) => ({
    id: `${h.provider}|${h.model}|${h.keyLast4}`,
    label: h.modelLabel,
    last4: h.keyLast4,
    providerName: customKeys.has(customId(h.provider, h.model)) ? h.providerName : null,
    status: h.inCooldown && h.cooldownUntil ? 'cooldown' : 'ready',
    cooldownTime: h.inCooldown && h.cooldownUntil ? formatCooldownTime(h.cooldownUntil) : null,
  }));

  const seen = new Set(rows.map((r) => r.id));
  const noKey = (id: string, label: string, providerName: string | null) => {
    if (seen.has(id)) return;
    seen.add(id);
    rows.push({ id, label, last4: null, providerName, status: 'no-key', cooldownTime: null });
  };
  options.filter((o) => !o.available).forEach((o) => noKey(`option|${o.id}`, o.label, null));
  customEntries
    .filter((e) => !e.hasKey)
    .forEach((e) => noKey(`custom|${customId(e.provider, e.model)}`, e.optionLabel, e.providerName));
  return rows;
}

/** A group's order, ready to print: "1 Gemini 3.8 Flash · 2 … · 3 anthropic/claude-haiku-5.5 (OpenRouter)". */
export function routingParts(entries: RoutingEntryDto[]) {
  return [...entries]
    .sort((a, b) => a.position - b.position)
    .map((e) => ({
      key: `${e.position}-${e.optionId}-${e.model ?? ''}`,
      position: e.position,
      label: e.optionLabel,
      custom: e.custom,
      providerName: e.providerName,
    }));
}

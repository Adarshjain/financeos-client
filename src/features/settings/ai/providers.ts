import type { LlmKeyDto, Schemas } from '@/lib/api/types';

export interface ProviderConfig {
  id: string;
  name: string;
  getKeyUrl: string;
}

/** The fixed provider list, in display order. */
export const PROVIDERS: ProviderConfig[] = [
  { id: 'gemini', name: 'Gemini', getKeyUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'groq', name: 'Groq', getKeyUrl: 'https://console.groq.com/keys' },
  { id: 'openrouter', name: 'OpenRouter', getKeyUrl: 'https://openrouter.ai/keys' },
];

export interface ProviderOption {
  id: string;
  name: string;
  /** The user holds an active key for this provider, so a typed model can actually be probed. */
  hasKey: boolean;
}

/** Which providers a typed model can be probed with: the fixed provider list, keyed or not. */
export function buildProviderOptions(keys: LlmKeyDto[]): ProviderOption[] {
  return PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    hasKey: keys.some((k) => k.provider.toLowerCase() === p.id.toLowerCase() && k.status === 'ACTIVE'),
  }));
}

/** Free tiers that may train on prompts: the add-key dialog warns before the key is saved. */
export function showTrainingWarning(
  catalog: Schemas['ProviderCatalogDto'][],
  providerId: string | undefined
): boolean | undefined {
  const entry = catalog.find((c) => c.id.toLowerCase() === providerId?.toLowerCase());
  return entry?.models.some((m) => m.free && (m.trainsOnData === 'yes' || m.trainsOnData === 'unknown'));
}

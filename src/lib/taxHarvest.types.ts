// GET /investments/tax/harvest (the tax_harvest widget), from the generated schema.

import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

export type TaxHarvestResponse = Schemas['TaxHarvestResponse'];
export type TaxHarvestRealised = Schemas['HarvestRealised'];
export type TaxHarvestSummary = Schemas['HarvestSummary'];
/** One open lot; `longTermOn` / `daysToLongTerm` are null for a slab-rate lot, `price` when unpriced. */
export type TaxHarvestLot = Schemas['HarvestOpenLot'];

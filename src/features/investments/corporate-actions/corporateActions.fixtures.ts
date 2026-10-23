import type { CorporateActionItem, CorporateActionPreview } from '@/lib/investments.types';

export const bonus: CorporateActionItem = {
  id: 'ca-1',
  instrumentId: 'i-infy',
  instrumentName: 'Infosys',
  instrumentSymbol: 'INFY',
  type: 'bonus',
  ratioFrom: 1,
  ratioTo: 2,
  exDate: '2025-06-10',
  notes: 'record date 11 Jun 25',
  targetInstrumentId: null,
  targetInstrumentName: null,
  targetInstrumentSymbol: null,
  costAllocationPct: null,
  fractionalCashInLieu: null,
  createdAt: '2025-06-11T00:00:00Z',
  quantityBefore: 30,
  quantityAfter: 60,
  costPerUnitBefore: 1420,
  costPerUnitAfter: 710,
};

export const split: CorporateActionItem = {
  ...bonus,
  id: 'ca-2',
  instrumentId: 'i-itc',
  instrumentName: 'ITC',
  instrumentSymbol: 'ITC',
  type: 'split',
  ratioTo: 2,
  exDate: '2025-02-20',
  notes: null,
  quantityBefore: 100,
  quantityAfter: 200,
  costPerUnitBefore: 410,
  costPerUnitAfter: 205,
};

export const demerger: CorporateActionItem = {
  ...split,
  id: 'ca-3',
  type: 'demerger',
  ratioFrom: 10,
  ratioTo: 1,
  exDate: '2025-01-06',
  targetInstrumentId: 'i-itch',
  targetInstrumentName: 'ITC Hotels',
  targetInstrumentSymbol: null,
  costAllocationPct: 1.5,
  fractionalCashInLieu: 12,
  quantityBefore: 100,
  quantityAfter: 100,
  costPerUnitBefore: 410,
  costPerUnitAfter: 403.85,
};

export function pageOf(items: CorporateActionItem[], over: Partial<{ page: number; size: number; totalElements: number; totalPages: number }> = {}) {
  return { items, page: 0, size: 25, totalElements: items.length, totalPages: 1, ...over };
}

export const previewDemerger: CorporateActionPreview = {
  holdings: [
    {
      brokerAccountId: 'b1',
      brokerAccountName: 'Zerodha',
      quantityBefore: 100,
      quantityAfter: 100,
      avgCostBefore: 410,
      avgCostAfter: 403.85,
      openCostBefore: 41000,
      openCostAfter: 40385,
      childInstrumentId: 'i-itch',
      childQuantity: 10,
      childCost: 615,
      fractionalRealized: null,
    },
  ],
};

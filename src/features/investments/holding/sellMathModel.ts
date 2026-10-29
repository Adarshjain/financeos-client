import type { SellEstimate, SellEstimateLot } from '@/lib/investments.types';
import { sanitizeDecimalInput } from '@/lib/utils';

// Mirrors HoldingsService.sellEstimate (server): the oldest lots first, the gain by term, and, for equity-oriented
// holdings, the tax the sale adds to the financial year (TaxHarvestService.realised before and after, set-off then
// exemption, every pool rounded to 2 dp half-up). The sell-all answer carries the lots and the year's booked net gains;
// an older server sends only the exemption left before, which is then rebuilt as one booked long-term gain.

const FY2024_EXEMPTION = 125000;
const BEFORE_FY2024_EXEMPTION = 100000;

/** Money to 2 dp, half up (BigDecimal HALF_UP); the epsilon keeps 1.005 style binary noise from rounding down. */
function money(value: number): number {
  const rounded = Math.round(Math.abs(value) * 100 + 1e-7) / 100;
  return value < 0 && rounded !== 0 ? -rounded : rounded;
}

interface Pools {
  netStcg: number;
  taxableLtcg: number;
  exemptionLeft: number;
}

/**
 * TaxHarvestService.realised on the year's net figures: short-term (all classes, slab included), equity long-term
 * and other-class long-term. Short-term losses offset short-term gains; long-term losses offset long-term gains
 * (other class first); short-term losses left offset the long-term gains left (other class first); the exemption
 * applies to the equity long-term gain left.
 */
function realised(shortNet: number, equityLongNet: number, otherLongNet: number, limit: number): Pools {
  const netStcg = Math.max(shortNet, 0);
  let stclLeft = Math.max(-shortNet, 0);
  let otherLtcg = Math.max(otherLongNet, 0);
  let equityLtcg = Math.max(equityLongNet, 0);
  let ltclLeft = Math.max(-otherLongNet, 0) + Math.max(-equityLongNet, 0);
  let used = Math.min(ltclLeft, otherLtcg);
  otherLtcg -= used;
  ltclLeft -= used;
  used = Math.min(ltclLeft, equityLtcg);
  equityLtcg -= used;
  ltclLeft -= used;
  used = Math.min(stclLeft, otherLtcg);
  otherLtcg -= used;
  stclLeft -= used;
  used = Math.min(stclLeft, equityLtcg);
  equityLtcg -= used;
  const exemptionUsed = Math.min(equityLtcg, limit);
  return {
    netStcg: money(netStcg),
    taxableLtcg: money(otherLtcg + equityLtcg - exemptionUsed),
    exemptionLeft: money(limit - exemptionUsed),
  };
}

function exemptionLimit(fy: number): number {
  return fy >= 2024 ? FY2024_EXEMPTION : BEFORE_FY2024_EXEMPTION;
}

/** What `lot` adds when `take` of its units are sold: cost, proceeds and gain. */
function lotFigures(est: SellEstimate, lot: SellEstimateLot, take: number) {
  const cost = lot.quantity > 0 ? (lot.cost / lot.quantity) * take : 0;
  const proceeds = est.noPrice || est.price == null ? cost : est.price * take;
  return { cost, proceeds, gain: proceeds - cost };
}

/** The sell-all answer re-figured for selling `quantity` (oldest lots first); `quantity` must be within 0 to est.quantity. */
export function sellFigures(est: SellEstimate, quantity: number): SellEstimate {
  const lots: SellEstimateLot[] = [];
  const raw: { term: string; gain: number }[] = [];
  let remaining = quantity;
  let cost = 0;
  let proceeds = 0;
  let longGain = 0;
  let shortGain = 0;
  for (const lot of est.lots) {
    if (remaining <= 1e-9) break;
    const take = Math.min(remaining, lot.quantity);
    remaining -= take;
    const f = lotFigures(est, lot, take);
    cost += f.cost;
    proceeds += f.proceeds;
    if (lot.term === 'long') longGain += f.gain;
    else shortGain += f.gain;
    raw.push({ term: lot.term, gain: f.gain });
    lots.push({
      ...lot,
      quantity: take,
      cost: money(f.cost),
      proceeds: money(f.proceeds),
      gain: money(f.gain),
    });
  }
  const out: SellEstimate = {
    ...est,
    quantity,
    proceeds: money(proceeds),
    cost: money(cost),
    gain: money(proceeds - cost),
    longTermGain: money(longGain),
    shortTermGain: money(shortGain),
    lots,
  };
  if (!est.equity || est.exemptionLeftBefore == null || est.stcgRate == null || est.ltcgRate == null) {
    return { ...out, stcgTax: null, ltcgTax: null, tax: null, exemptionLeftAfter: null };
  }
  const limit = est.exemptionLimit ?? exemptionLimit(est.fy);
  // Booked figures come from the server; an older one sends none, so rebuild them as one long-term gain that used up
  // that much of the exemption.
  const known = est.bookedShortTermGain != null && est.bookedEquityLongTermGain != null && est.bookedOtherLongTermGain != null;
  const bookedShort = known ? (est.bookedShortTermGain as number) : 0;
  const bookedEquityLong = known ? (est.bookedEquityLongTermGain as number) : Math.max(limit - est.exemptionLeftBefore, 0);
  const bookedOtherLong = known ? (est.bookedOtherLongTermGain as number) : 0;
  let saleShort = bookedShort;
  let saleLong = bookedEquityLong;
  for (const lot of raw) {
    if (lot.term === 'long') saleLong += lot.gain;
    else saleShort += lot.gain;
  }
  const before = realised(bookedShort, bookedEquityLong, bookedOtherLong, limit);
  const after = realised(saleShort, saleLong, bookedOtherLong, limit);
  const stcgTax = money(Math.max(after.netStcg - before.netStcg, 0) * est.stcgRate);
  const ltcgTax = money(Math.max(after.taxableLtcg - before.taxableLtcg, 0) * est.ltcgRate);
  return { ...out, stcgTax, ltcgTax, tax: money(stcgTax + ltcgTax), exemptionLeftBefore: before.exemptionLeft, exemptionLeftAfter: after.exemptionLeft };
}

/** The i-th grid point (whole units, or thousandths for a fund) without float noise. */
function at(i: number, step: number): number {
  return Number((i * step).toFixed(6));
}

/**
 * The largest quantity N such that selling any quantity from one step up to N (oldest lots first) adds no tax this
 * year; `step` is 1 for stocks and ETFs, 0.001 for funds. 0 when nothing is free, the holding is not equity-oriented
 * or there is no price. N may be the whole holding (even when it is not on the grid).
 */
export function taxFreeQuantity(est: SellEstimate, step: number): number {
  if (!est.equity || est.noPrice || est.price == null || est.tax == null) return 0;
  const free = (q: number) => (sellFigures(est, q).tax ?? 1) <= 0;
  const held = est.quantity;
  let best = 0;
  let start = 0;
  for (let i = 0; i < est.lots.length; i += 1) {
    const lot = est.lots[i];
    const end = start + lot.quantity;
    const last = i === est.lots.length - 1;
    // Grid points inside this lot: (start, end]; the last lot also ends at the whole holding off the grid.
    const lo = Math.floor(start / step + 1e-9) + 1;
    const hi = Math.floor(end / step + 1e-9);
    const top = last ? held : null;
    // Within a lot the gain per unit is constant, so tax only rises (gain) or only falls (loss) along it.
    let reached = best;
    if (hi >= lo) {
      if (free(at(hi, step))) {
        reached = at(hi, step);
      } else if (free(at(lo, step))) {
        let a = lo;
        let b = hi;
        while (b - a > 1) {
          const mid = Math.floor((a + b) / 2);
          if (free(at(mid, step))) a = mid;
          else b = mid;
        }
        return at(a, step);
      } else {
        return best;
      }
    }
    if (top != null && top > reached + 1e-9) {
      if (free(top)) reached = top;
      else return reached;
    }
    best = reached;
    start = end;
  }
  return best;
}

/** The step of a holding's quantity: whole units for stocks and ETFs, thousandths for funds. */
export function quantityStep(assetType: string): number {
  return assetType === 'mutual_fund' ? 0.001 : 1;
}

/** What a quantity field keeps of the typed text: digits only for stocks and ETFs, digits and one decimal point for funds. */
export function sanitizeQuantityInput(text: string, assetType: string): string {
  return quantityStep(assetType) < 1 ? sanitizeDecimalInput(text) : text.replace(/[^0-9]/g, '');
}

export type QuantityCheck = { ok: true; quantity: number } | { ok: false };

/** The typed text as a quantity within 0 (exclusive) and `held`; anything else is not ok. */
export function checkQuantity(text: string, held: number): QuantityCheck {
  const t = text.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return { ok: false };
  const q = Number(t);
  if (!(q > 0) || q > held + 1e-9) return { ok: false };
  return { ok: true, quantity: Math.min(q, held) };
}

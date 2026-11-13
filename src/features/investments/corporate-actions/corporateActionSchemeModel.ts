import type {
  CorporateActionSchemeChild,
  CorporateActionSchemeDetails,
  CorporateActionSchemeHoldingsCheck,
  CorporateActionSchemeSource,
} from '@/lib/api/types';
import { formatDate, formatQuantity } from '@/lib/format';

/** What the company's notices say about a demerger or merger (null until they have been read). */
export type SchemeDetails = CorporateActionSchemeDetails;

/** One plain line of evidence; `noticeUrl` adds a "View notice" link that opens the company's notice. */
export interface EvidenceLine {
  text: string;
  noticeUrl?: string;
}

type SchemeKind = 'demerger' | 'merger';

const date = (v: string | null | undefined) => formatDate(v, 'input');

/** "13.51%": at most two decimals, none when whole. */
export const pctText = (n: number): string => `${Number(n.toFixed(2))}%`;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** A notice link is opened in a new tab only when it is a plain https address. */
export const safeNoticeUrl = (url: string | null | undefined): string | undefined => (url && /^https:\/\//.test(url) ? url : undefined);

/** "From the company's notice of 18/12/24". */
export function noticeSource(source: Pick<CorporateActionSchemeSource, 'date' | 'url'>): EvidenceLine {
  return { text: source.date ? `From the company's notice of ${date(source.date)}` : "From the company's notice", noticeUrl: safeNoticeUrl(source.url) };
}

export const ESTIMATE_SOURCE_TEXT = "Estimated from prices around the ex-date. The company hasn't published its split yet.";

/** "ITC Hotels (ITCHOTELS), listed on NSE 29/01/25". */
export function childText(c: Pick<CorporateActionSchemeChild, 'name' | 'symbol' | 'listedOn'>): string {
  return `${c.name} (${c.symbol})${c.listedOn ? `, listed on NSE ${date(c.listedOn)}` : ''}`;
}

function companyLines(details: SchemeDetails, kind: SchemeKind): EvidenceLine[] {
  const label = kind === 'merger' ? 'Merging into' : 'New company';
  return details.children.map((c) => ({ text: `${label}: ${childText(c)}` }));
}

function ratioLines(details: SchemeDetails, parentName: string): EvidenceLine[] {
  const out: EvidenceLine[] = [];
  for (const c of details.children) {
    if (c.ratioFrom == null || c.ratioTo == null) continue;
    out.push({
      text: `${formatQuantity(c.ratioTo)} ${c.name} ${plural(c.ratioTo, 'share', 'shares')} for every ${formatQuantity(c.ratioFrom)} ${parentName} ${plural(c.ratioFrom, 'share', 'shares')}`,
    });
    if (c.ratioSource) out.push(noticeSource(c.ratioSource));
  }
  return out;
}

function costLines(details: SchemeDetails, parentName: string): EvidenceLine[] {
  if (details.parentCostPct == null) return [];
  const parts = [`${parentName} ${pctText(details.parentCostPct)}`];
  for (const c of details.children) if (c.childCostPct != null) parts.push(`${c.name} ${pctText(c.childCostPct)}`);
  const out: EvidenceLine[] = [{ text: `Cost split: ${parts.join(', ')}` }];
  if (details.costKind === 'ESTIMATE') out.push({ text: ESTIMATE_SOURCE_TEXT });
  else if (details.costSource) out.push(noticeSource(details.costSource));
  return out;
}

function holdingLine(check: CorporateActionSchemeHoldingsCheck, kind: SchemeKind, children: CorporateActionSchemeChild[]): string {
  const target = children.length === 1 ? children[0].name : kind === 'merger' ? 'acquirer' : 'new company';
  const shares = (n: number) =>
    children.length === 1 ? `${formatQuantity(n)} ${target} ${plural(n, 'share', 'shares')}` : `${formatQuantity(n)} ${plural(n, 'share', 'shares')} of the ${target}`;
  const account = check.accountName;
  if (check.source === 'NONE') {
    return `${account}: no holdings file or sales of ${children.length === 1 ? target : `the ${target}`} yet. Import a holdings file to confirm.`;
  }
  const tradebook = check.source === 'TRADEBOOK';
  const asOf = check.asOf ? ` of ${date(check.asOf)}` : '';
  const upTo = check.asOf ? ` up to ${date(check.asOf)}` : '';
  const where = tradebook ? `sales in the tradebook${upTo} add up to` : `holdings file${asOf} shows`;
  return check.agrees
    ? `${account}: ${where} ${shares(check.foundQty)}, as the ratio gives.`
    : `${account}: expected ${shares(check.expectedQty)}, ${where} ${formatQuantity(check.foundQty)}.`;
}

/** One line per broker account that held the parent. */
export function holdingsLines(details: SchemeDetails, kind: SchemeKind): EvidenceLine[] {
  return details.holdingsCheck.map((c) => ({ text: holdingLine(c, kind, details.children) }));
}

/** One plain sentence per code the server gives for a value it could not fill. */
export function missingText(code: string, kind: SchemeKind, checkedAt: string): string | null {
  const company = kind === 'merger' ? 'acquiring company' : 'new company';
  const checked = `Last checked ${date(checkedAt)}.`;
  switch (code) {
    case 'CHILD_NOT_NAMED':
      return `The notices don't name the ${company}.`;
    case 'RATIO_NOT_FOUND':
      return "The notices don't give the ratio.";
    case 'COST_NOT_PUBLISHED_YET':
      return `The company hasn't published the cost split yet. ${checked}`;
    case 'COST_UNCLEAR':
      return "The notices mention the cost split but we couldn't read it. Check the company's announcement.";
    case 'NOTICE_SCANNED':
      return "A notice is a scanned document we couldn't read. Check the company's announcement.";
    case 'NOTICES_DISAGREE':
      return "The company's notices give different ratios, so we haven't used any of them.";
    case 'NO_NOTICES':
      return `We found no notices from the company about this yet. ${checked}`;
    case 'NOTICES_UNAVAILABLE':
      return `We couldn't reach the exchange notices. ${checked}`;
    default:
      return null;
  }
}

export function missingLines(details: SchemeDetails, kind: SchemeKind): EvidenceLine[] {
  return details.missing.flatMap((code) => {
    const text = missingText(code, kind, details.checkedAt);
    return text ? [{ text }] : [];
  });
}

/** Everything the notices and the user's holdings show about a scheme, in reading order. */
export function schemeEvidence(details: SchemeDetails, ctx: { kind: SchemeKind; parentName: string }): EvidenceLine[] {
  return [
    ...companyLines(details, ctx.kind),
    ...ratioLines(details, ctx.parentName),
    ...(ctx.kind === 'demerger' ? costLines(details, ctx.parentName) : []),
    ...holdingsLines(details, ctx.kind),
    ...missingLines(details, ctx.kind),
  ];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The cost allocation to enter for child `index`. The server applies the percentage to what is left of the parent's cost,
 * so a later child's share of the original cost is scaled up by what the earlier children took. Null when it can't be worked out.
 */
export function costAllocationFor(children: CorporateActionSchemeChild[], index: number): number | null {
  let taken = 0;
  for (let i = 0; i < index; i++) {
    const p = children[i]?.childCostPct;
    if (p == null) return null;
    taken += p;
  }
  const own = children[index]?.childCostPct;
  if (own == null || taken >= 100) return null;
  return round2((own / (100 - taken)) * 100);
}

/** A demerger already recorded on the parent, as far as matching it to a child needs. */
export interface RecordedAction {
  type: string;
  exDate: string;
  targetInstrumentId?: string | null;
  targetInstrumentSymbol?: string | null;
}

/** The first child with no demerger recorded yet on this ex-date (matched by instrument, else by symbol); 0 when none or all are. */
export function firstUnrecordedChild(children: CorporateActionSchemeChild[], actions: RecordedAction[], exDate: string): number {
  const day = exDate.slice(0, 10);
  const same = actions.filter((a) => a.type === 'demerger' && a.exDate.slice(0, 10) === day);
  const recorded = (c: CorporateActionSchemeChild) =>
    same.some(
      (a) =>
        (c.instrumentId != null && a.targetInstrumentId === c.instrumentId) ||
        (a.targetInstrumentSymbol != null && a.targetInstrumentSymbol.toUpperCase() === c.symbol.toUpperCase()),
    );
  const i = children.findIndex((c) => !recorded(c));
  return i < 0 ? 0 : i;
}

const joinNames = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** The muted lines under each prefilled field of the record dialog. */
export interface FieldSources {
  target: EvidenceLine[];
  ratio: EvidenceLine[];
  cost: EvidenceLine[];
}

export function prefillSources(details: SchemeDetails, kind: SchemeKind, index: number): FieldSources {
  const child = details.children[index];
  if (!child) return { target: [], ratio: [], cost: [] };
  const target: EvidenceLine[] = [
    child.ratioSource
      ? { text: child.ratioSource.date ? `Named in the company's notice of ${date(child.ratioSource.date)}` : "Named in the company's notice", noticeUrl: safeNoticeUrl(child.ratioSource.url) }
      : { text: "Named in the company's notices" },
  ];
  const ratio = child.ratioFrom != null && child.ratioTo != null && child.ratioSource ? [noticeSource(child.ratioSource)] : [];
  const cost: EvidenceLine[] = [];
  const converted = kind === 'demerger' ? costAllocationFor(details.children, index) : null;
  if (converted != null && child.childCostPct != null) {
    if (details.costKind === 'ESTIMATE') cost.push({ text: 'Estimated from prices' });
    else if (details.costSource) cost.push(noticeSource(details.costSource));
    if (index > 0) {
      const earlier = joinNames(details.children.slice(0, index).map((c) => c.name));
      cost.push({ text: `${pctText(child.childCostPct)} of the original cost, which is ${pctText(converted)} of what's left after ${earlier}` });
    }
  }
  return { target, ratio, cost };
}

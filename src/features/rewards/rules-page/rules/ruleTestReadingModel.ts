import type { RewardRuleFormFields } from '@/features/rewards/rules/form/useRewardRuleFormFields';
import { formatMoney, formatPercent, formatQuantity } from '@/lib/format';

type Fields = Pick<
  RewardRuleFormFields,
  'previewAmount' | 'accrualType' | 'percentRate' | 'slabSize' | 'pointsPerSlab' | 'isTiered' | 'rewardType'
>;

/** How the Test this rule result reads: a headline figure, a verdict line, and the tone both take. */
export interface RuleTestReading {
  /** The reward the transaction would earn ("₹125.00", "62.5 pts"); null when the rule can't be judged here. */
  headline: string | null;
  verdict: string;
  tone: 'positive' | 'warning';
}

const rupees = (n: number) => formatMoney(n, { decimals: 'auto' });
const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Splits the preview's one-line result (`Matches → ₹125.00 cashback`, `No match — below minimum amount ₹500`) into the
 * headline and verdict the dialog shows. The preview hook is shared with Legacy, so the wording is read, not changed.
 */
export function readRuleTest(preview: { matched: boolean; text: string }, f: Fields): RuleTestReading {
  const nothing = f.rewardType === 'POINTS' ? '0 pts' : '₹0';
  if (preview.matched) {
    const [, paid = '', tier] = /^Matches → (.+?)( \(tier progress assumed ₹0\))?$/.exec(preview.text) ?? [];
    const amount = rupees(Number(f.previewAmount));
    const points = f.rewardType === 'POINTS';
    const basis = f.isTiered
      ? `Tiered rate on ${amount}`
      : f.accrualType === 'PERCENT'
        ? `${formatPercent(Number(f.percentRate), { decimals: 2 })} of ${amount}`
        : `${points ? `${formatQuantity(Number(f.pointsPerSlab), 2)} pts` : formatMoney(Number(f.pointsPerSlab), { decimals: 'auto' })} per ${formatMoney(Number(f.slabSize), { decimals: 'auto' })} slab on ${amount}`;
    return {
      headline: paid.replace(/ cashback$/, '') || null,
      verdict: ['Matches', basis, tier ? 'tier progress assumed ₹0' : null].filter(Boolean).join(' · '),
      tone: 'positive',
    };
  }
  const reason = /^No match — (.+)$/.exec(preview.text)?.[1];
  if (reason) return { headline: nothing, verdict: `No match · ${upper(reason)}`, tone: 'warning' };
  return { headline: null, verdict: preview.text, tone: 'warning' };
}

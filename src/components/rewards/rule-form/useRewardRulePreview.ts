'use client';

import { useMemo } from 'react';

import { formatMoney } from '@/lib/utils';

import type { RewardRuleFormFields } from './useRewardRuleFormFields';

/** The "test this rule" live preview — replays the same matching + accrual logic the engine runs server-side. */
export function useRewardRulePreview(fields: RewardRuleFormFields): { matched: boolean; text: string } | null {
  const {
    previewAmount, previewDescription, previewMcc, previewChannel, previewCategories, previewEmi, previewIntl,
    selectedCategories, mccText, merchantPattern, merchantMatch, channels, minAmount, maxAmount,
    emiTreatment, intlTreatment, rewardType, accrualType, percentRate, rounding, slabSize, pointsPerSlab,
    pointPrecision, isTiered, tierRows,
  } = fields;

  return useMemo((): { matched: boolean; text: string } | null => {
    const amount = Number(previewAmount);
    if (!previewAmount.trim() || Number.isNaN(amount) || amount <= 0) return null;

    const ruleMccs = mccText
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const hasCategoryPredicate = selectedCategories.length > 0;
    const hasMccPredicate = ruleMccs.length > 0;
    if (hasCategoryPredicate || hasMccPredicate) {
      const categoryHit =
        hasCategoryPredicate &&
        previewCategories.some((pc) =>
          selectedCategories.some((sc) => sc.id === pc.id)
        );
      const mccHit =
        hasMccPredicate &&
        !!previewMcc.trim() &&
        ruleMccs.includes(previewMcc.trim());
      if (!categoryHit && !mccHit) {
        return {
          matched: false,
          text: 'No match — category/MCC not covered by this rule',
        };
      }
    }
    const pattern = merchantPattern.trim().toLowerCase();
    if (pattern && merchantMatch !== 'NONE') {
      const haystack = previewDescription.trim().toLowerCase();
      const hit: boolean | null = !haystack
        ? false
        : merchantMatch === 'CONTAINS'
        ? haystack.includes(pattern)
        : merchantMatch === 'STARTS_WITH'
        ? haystack.startsWith(pattern)
        : merchantMatch === 'EXACT'
        ? haystack === pattern
        : (() => {
            try {
              return new RegExp(merchantPattern.trim(), 'i').test(
                previewDescription
              );
            } catch {
              return null;
            }
          })();
      if (hit === null) {
        return {
          matched: false,
          text: 'Can’t test this regex in the browser (Java-only syntax) — verify via the report',
        };
      }
      if (!hit)
        return {
          matched: false,
          text: 'No match — description doesn’t match the merchant pattern',
        };
    }
    if (
      channels.length > 0 &&
      (previewChannel === 'NONE' || !channels.includes(previewChannel))
    ) {
      return {
        matched: false,
        text: 'No match — channel not covered by this rule',
      };
    }
    if (minAmount.trim() && amount < Number(minAmount)) {
      return {
        matched: false,
        text: `No match — below minimum amount ₹${minAmount}`,
      };
    }
    if (maxAmount.trim() && amount > Number(maxAmount)) {
      return {
        matched: false,
        text: `No match — above maximum amount ₹${maxAmount}`,
      };
    }
    if (emiTreatment === 'EXCLUDE_EMI' && previewEmi)
      return { matched: false, text: 'No match — EMI spends are excluded' };
    if (emiTreatment === 'ONLY_EMI' && !previewEmi)
      return { matched: false, text: 'No match — rule applies to EMI spends only' };
    if (intlTreatment === 'EXCLUDE_INTL' && previewIntl)
      return {
        matched: false,
        text: 'No match — international spends are excluded',
      };
    if (intlTreatment === 'ONLY_INTL' && !previewIntl)
      return {
        matched: false,
        text: 'No match — rule applies to international spends only',
      };

    const slab = Number(slabSize);
    const precision = Number(pointPrecision) || 0;
    const factor = Math.pow(10, precision);
    const paid = (n: number) => {
      const display = Math.round(n * 100) / 100;
      return rewardType === 'POINTS'
        ? `${display} pts`
        : `${formatMoney(display)} cashback`;
    };

    if (isTiered) {
      if (tierRows.some((t) => !t.rate.trim())) return null;
      let remaining = amount;
      let position = 0;
      let total = 0;
      for (let i = 0; i < tierRows.length && remaining > 0; i++) {
        const last = i === tierRows.length - 1;
        const upTo = last ? Infinity : Number(tierRows[i].upTo);
        if (!last && (!tierRows[i].upTo.trim() || Number.isNaN(upTo))) return null;
        const headroom = upTo - position;
        if (headroom <= 0) continue;
        const tranche = Math.min(remaining, headroom);
        const rate = Number(tierRows[i].rate);
        if (accrualType === 'PERCENT') {
          total += (tranche * rate) / 100;
        } else {
          if (!slabSize.trim() || Number.isNaN(slab) || slab <= 0) return null;
          total += Math.floor(tranche / slab) * rate;
        }
        position += tranche;
        remaining -= tranche;
      }
      if (accrualType === 'PERCENT') {
        if (rounding === 'FLOOR_RUPEE') total = Math.floor(total);
        if (rounding === 'NEAREST_RUPEE') total = Math.round(total);
      } else {
        total = Math.floor(total * factor) / factor;
      }
      return {
        matched: true,
        text: `Matches → ${paid(total)} (tier progress assumed ₹0)`,
      };
    }

    if (accrualType === 'PERCENT') {
      const rate = Number(percentRate);
      if (!percentRate.trim() || Number.isNaN(rate)) return null;
      let earned = (amount * rate) / 100;
      if (rounding === 'FLOOR_RUPEE') earned = Math.floor(earned);
      if (rounding === 'NEAREST_RUPEE') earned = Math.round(earned);
      return { matched: true, text: `Matches → ${paid(earned)}` };
    }
    const perSlab = Number(pointsPerSlab);
    if (
      !slabSize.trim() ||
      !pointsPerSlab.trim() ||
      Number.isNaN(slab) ||
      slab <= 0 ||
      Number.isNaN(perSlab)
    ) {
      return null;
    }
    const earned =
      Math.floor(Math.floor(amount / slab) * perSlab * factor) / factor;
    return { matched: true, text: `Matches → ${paid(earned)}` };
  }, [
    previewAmount,
    previewDescription,
    previewMcc,
    previewChannel,
    previewCategories,
    previewEmi,
    previewIntl,
    selectedCategories,
    mccText,
    merchantPattern,
    merchantMatch,
    channels,
    minAmount,
    maxAmount,
    emiTreatment,
    intlTreatment,
    rewardType,
    accrualType,
    percentRate,
    rounding,
    slabSize,
    pointsPerSlab,
    pointPrecision,
    isTiered,
    tierRows,
  ]);
}

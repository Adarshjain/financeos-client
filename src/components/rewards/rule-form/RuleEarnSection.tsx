'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AccrualType,
  CapWindow,
  CashbackRounding,
  RewardType,
} from '@/lib/rewards.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import {
  chipClass,
  inputClass,
  sectionClass,
  sectionTitleClass,
  selectTriggerClass,
} from './constants';
import { TieredRateInputs } from './TieredRateInputs';

interface RuleEarnSectionProps {
  defaultRewardType: RewardType;
  rewardType: RewardType;
  setRewardType: (t: RewardType) => void;
  accrualType: AccrualType;
  setAccrualType: (t: AccrualType) => void;
  isTiered: boolean;
  setIsTiered: React.Dispatch<React.SetStateAction<boolean>>;
  percentRate: string;
  setPercentRate: (r: string) => void;
  rounding: CashbackRounding;
  setRounding: (r: CashbackRounding) => void;
  slabSize: string;
  setSlabSize: (s: string) => void;
  pointsPerSlab: string;
  setPointsPerSlab: (p: string) => void;
  pointPrecision: string;
  setPointPrecision: (p: string) => void;
  tierWindow: CapWindow;
  setTierWindow: (w: CapWindow) => void;
  tierRows: { upTo: string; rate: string }[];
  setTierRows: React.Dispatch<React.SetStateAction<{ upTo: string; rate: string }[]>>;
}

export function RuleEarnSection({
  defaultRewardType,
  rewardType,
  setRewardType,
  accrualType,
  setAccrualType,
  isTiered,
  setIsTiered,
  percentRate,
  setPercentRate,
  rounding,
  setRounding,
  slabSize,
  setSlabSize,
  pointsPerSlab,
  setPointsPerSlab,
  pointPrecision,
  setPointPrecision,
  tierWindow,
  setTierWindow,
  tierRows,
  setTierRows,
}: RuleEarnSectionProps) {
  return (
    <div className={sectionClass}>
      <span className={sectionTitleClass}>Earn</span>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Rewards paid as{' '}
          <span className="text-slate-400">
            (card default:{' '}
            {defaultRewardType === 'POINTS' ? 'reward points' : 'cash'})
          </span>
        </Label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setRewardType('CASH')}
            className={chipClass(rewardType === 'CASH')}
          >
            Cash ₹
          </button>
          <button
            type="button"
            onClick={() => setRewardType('POINTS')}
            className={chipClass(rewardType === 'POINTS')}
          >
            Reward points
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          How it accrues
        </Label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setAccrualType('PERCENT')}
            className={chipClass(accrualType === 'PERCENT')}
          >
            % of spend
          </button>
          <button
            type="button"
            onClick={() => setAccrualType('SLAB')}
            className={chipClass(accrualType === 'SLAB')}
          >
            Per slab
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {accrualType === 'PERCENT' ? (
          <>
            {!isTiered && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Rate %
                </Label>
                <Input
                  inputMode="decimal"
                  value={percentRate}
                  onChange={(e) =>
                    setPercentRate(sanitizeDecimalInput(e.target.value))
                  }
                  placeholder="e.g. 5"
                  className={inputClass}
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Rounding
              </Label>
              <Select
                value={rounding}
                onValueChange={(v) => setRounding(v as CashbackRounding)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" className="text-xs">
                    {rewardType === 'POINTS' ? 'Keep decimals' : 'Keep paise'}
                  </SelectItem>
                  <SelectItem value="FLOOR_RUPEE" className="text-xs">
                    {rewardType === 'POINTS'
                      ? 'Floor to whole point'
                      : 'Floor to rupee'}
                  </SelectItem>
                  <SelectItem value="NEAREST_RUPEE" className="text-xs">
                    {rewardType === 'POINTS'
                      ? 'Nearest whole point'
                      : 'Nearest rupee'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Slab size ₹
              </Label>
              <Input
                inputMode="decimal"
                value={slabSize}
                onChange={(e) =>
                  setSlabSize(sanitizeDecimalInput(e.target.value))
                }
                placeholder="e.g. 150"
                className={inputClass}
              />
            </div>
            {!isTiered && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {rewardType === 'POINTS' ? 'Points per slab' : '₹ per slab'}
                </Label>
                <Input
                  inputMode="decimal"
                  value={pointsPerSlab}
                  onChange={(e) =>
                    setPointsPerSlab(sanitizeDecimalInput(e.target.value))
                  }
                  placeholder="e.g. 5"
                  className={inputClass}
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {rewardType === 'POINTS' ? 'Point precision' : 'Value precision'}
              </Label>
              <Select value={pointPrecision} onValueChange={setPointPrecision}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-xs">
                    {rewardType === 'POINTS' ? 'Whole points' : 'Whole rupees'}
                  </SelectItem>
                  <SelectItem value="1" className="text-xs">
                    1 decimal
                  </SelectItem>
                  <SelectItem value="2" className="text-xs">
                    2 decimals
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Tiered (marginal) rate */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setIsTiered((p) => !p)}
          className={chipClass(isTiered)}
        >
          Tiered rate
        </button>
        <span className="text-2xs text-slate-400 dark:text-slate-500">
          Rate steps as matched spend grows in a window (e.g. 10X above ₹20k/cycle)
        </span>
      </div>
      {isTiered && (
        <TieredRateInputs
          tierWindow={tierWindow}
          setTierWindow={setTierWindow}
          tierRows={tierRows}
          setTierRows={setTierRows}
          accrualType={accrualType}
          rewardType={rewardType}
        />
      )}
      {rewardType === 'POINTS' && (
        <p className="text-2xs text-slate-400 dark:text-slate-500">
          Points are tracked as points — the report doesn’t convert them to a cash value.
        </p>
      )}
      <p className="text-2xs text-slate-400 dark:text-slate-500">
        Tip: a 0-rate exclusive rule at high priority models an exclusion (e.g. fuel earns nothing).
      </p>
    </div>
  );
}

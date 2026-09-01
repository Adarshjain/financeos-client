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
  MilestonePayoutTiming,
  MilestonePayoutType,
  RewardType,
} from '@/lib/rewards.types';
import { sanitizeDecimalInput } from '@/lib/utils';

interface MilestonePayoutSectionProps {
  payoutType: MilestonePayoutType;
  setPayoutType: (p: MilestonePayoutType) => void;
  rewardType: RewardType;
  setRewardType: (r: RewardType) => void;
  payoutValue: string;
  setPayoutValue: (v: string) => void;
  payoutTiming: MilestonePayoutTiming;
  setPayoutTiming: (t: MilestonePayoutTiming) => void;
  selectTriggerClass: string;
  inputClass: string;
}

export function MilestonePayoutSection({
  payoutType,
  setPayoutType,
  rewardType,
  setRewardType,
  payoutValue,
  setPayoutValue,
  payoutTiming,
  setPayoutTiming,
  selectTriggerClass,
  inputClass,
}: MilestonePayoutSectionProps) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Payout
        </Label>
        <Select
          value={payoutType}
          onValueChange={(v) => setPayoutType(v as MilestonePayoutType)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CASH_VALUE" className="text-xs">
              Fixed reward (voucher/bonus)
            </SelectItem>
            <SelectItem value="INFO_TRACKER" className="text-xs">
              Tracker only (e.g. fee waiver)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {payoutType === 'CASH_VALUE' && (
        <>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Paid as
            </Label>
            <Select
              value={rewardType}
              onValueChange={(v) => setRewardType(v as RewardType)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH" className="text-xs">
                  Cash ₹
                </SelectItem>
                <SelectItem value="POINTS" className="text-xs">
                  Reward points
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Payout value {rewardType === 'POINTS' ? '(pts)' : '₹'}
            </Label>
            <Input
              inputMode="decimal"
              value={payoutValue}
              onChange={(e) =>
                setPayoutValue(sanitizeDecimalInput(e.target.value))
              }
              placeholder="e.g. 1000"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Credited
            </Label>
            <Select
              value={payoutTiming}
              onValueChange={(v) =>
                setPayoutTiming(v as MilestonePayoutTiming)
              }
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WINDOW_END" className="text-xs">
                  At window end
                </SelectItem>
                <SelectItem value="ON_ACHIEVEMENT" className="text-xs">
                  On achievement date
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </>
  );
}

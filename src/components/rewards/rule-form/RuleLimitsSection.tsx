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
  CapExhaustedBehavior,
  CapWindow,
  RewardCapBucket,
  RewardType,
} from '@/lib/rewards.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import {
  CAP_WINDOW_LABELS,
  inputClass,
  sectionClass,
  sectionTitleClass,
  selectTriggerClass,
} from './constants';

interface RuleLimitsSectionProps {
  rewardType: RewardType;
  perTxnCap: string;
  setPerTxnCap: (c: string) => void;
  capMode: 'NONE' | 'OWN' | 'BUCKET';
  setCapMode: (m: 'NONE' | 'OWN' | 'BUCKET') => void;
  capBuckets: RewardCapBucket[];
  periodCap: string;
  setPeriodCap: (c: string) => void;
  capWindow: CapWindow;
  setCapWindow: (w: CapWindow) => void;
  capBucketId: string;
  setCapBucketId: (id: string) => void;
  onCapExhausted: CapExhaustedBehavior;
  setOnCapExhausted: (b: CapExhaustedBehavior) => void;
}

export function RuleLimitsSection({
  rewardType,
  perTxnCap,
  setPerTxnCap,
  capMode,
  setCapMode,
  capBuckets,
  periodCap,
  setPeriodCap,
  capWindow,
  setCapWindow,
  capBucketId,
  setCapBucketId,
  onCapExhausted,
  setOnCapExhausted,
}: RuleLimitsSectionProps) {
  return (
    <div className={sectionClass}>
      <span className={sectionTitleClass}>Limits</span>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Per-transaction cap {rewardType === 'POINTS' ? '(pts)' : '(₹)'}
        </Label>
        <Input
          inputMode="decimal"
          value={perTxnCap}
          onChange={(e) => setPerTxnCap(sanitizeDecimalInput(e.target.value))}
          placeholder="No cap"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Period cap
        </Label>
        <Select
          value={capMode}
          onValueChange={(v) => setCapMode(v as 'NONE' | 'OWN' | 'BUCKET')}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE" className="text-xs">
              No period cap
            </SelectItem>
            <SelectItem value="OWN" className="text-xs">
              This rule’s own cap
            </SelectItem>
            <SelectItem
              value="BUCKET"
              className="text-xs"
              disabled={capBuckets.length === 0}
            >
              Shared bucket{capBuckets.length === 0 ? ' (none yet)' : ''}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {capMode === 'OWN' && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Cap {rewardType === 'POINTS' ? '(pts)' : '(₹)'}
            </Label>
            <Input
              inputMode="decimal"
              value={periodCap}
              onChange={(e) => setPeriodCap(sanitizeDecimalInput(e.target.value))}
              placeholder="e.g. 500"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Cap window
            </Label>
            <Select
              value={capWindow}
              onValueChange={(v) => setCapWindow(v as CapWindow)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CAP_WINDOW_LABELS) as CapWindow[]).map((w) => (
                  <SelectItem key={w} value={w} className="text-xs">
                    {CAP_WINDOW_LABELS[w]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {capMode === 'BUCKET' && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Shared bucket
          </Label>
          <Select value={capBucketId} onValueChange={setCapBucketId}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Pick a bucket" />
            </SelectTrigger>
            <SelectContent>
              {capBuckets.map((b) => (
                <SelectItem
                  key={b.id}
                  value={b.id}
                  className="text-xs"
                  disabled={b.rewardType !== rewardType}
                >
                  {b.name} — {b.cap} {b.rewardType === 'POINTS' ? 'pts' : '₹'} /{' '}
                  {CAP_WINDOW_LABELS[b.windowType].toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-2xs text-slate-400 dark:text-slate-500">
            Several rules can drain one bucket’s ceiling together (manage buckets on
            the Rules page). A bucket only takes rules of its own reward type.
          </span>
        </div>
      )}

      {capMode !== 'NONE' && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            When cap exhausted
          </Label>
          <Select
            value={onCapExhausted}
            onValueChange={(v) => setOnCapExhausted(v as CapExhaustedBehavior)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FALL_THROUGH" className="text-xs">
                Fall through to next rule
              </SelectItem>
              <SelectItem value="STOP" className="text-xs">
                Stop (earn nothing)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

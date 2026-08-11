'use client';

import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createRewardCapBucket, deleteRewardCapBucket, updateRewardCapBucket } from '@/actions/rewards';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CapWindow, RewardCapBucket, RewardType } from '@/lib/rewards.types';
import { sanitizeDecimalInput } from '@/lib/utils';

const WINDOW_LABELS: Record<CapWindow, string> = {
  DAY: 'Per day',
  CALENDAR_MONTH: 'Per calendar month',
  STATEMENT_CYCLE: 'Per statement cycle',
  QUARTER: 'Per quarter',
  CALENDAR_YEAR: 'Per calendar year',
  ANNIVERSARY_YEAR: 'Per anniversary year',
};

interface RewardCapBucketsManagerProps {
  accountId: string;
  buckets: RewardCapBucket[];
  onChanged: () => void;
}

/** Shared cap buckets list + CRUD for one account. */
export default function RewardCapBucketsManager({ accountId, buckets, onChanged }: RewardCapBucketsManagerProps) {
  const [editing, setEditing] = useState<RewardCapBucket | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  const [rewardType, setRewardType] = useState<RewardType>('CASH');
  const [windowType, setWindowType] = useState<CapWindow>('CALENDAR_MONTH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = () => {
    setEditing(undefined);
    setName('');
    setCap('');
    setRewardType('CASH');
    setWindowType('CALENDAR_MONTH');
    setIsCreateOpen(true);
  };

  const openEdit = (bucket: RewardCapBucket) => {
    setEditing(bucket);
    setName(bucket.name);
    setCap(String(bucket.cap));
    setRewardType(bucket.rewardType);
    setWindowType(bucket.windowType);
    setIsCreateOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error('Bucket name is required.');
      return;
    }
    if (!(Number(cap) > 0)) {
      toast.error('Cap must be a positive number.');
      return;
    }
    const body = { accountId, name: name.trim(), cap: Number(cap), rewardType, windowType };
    setIsSubmitting(true);
    try {
      const res = editing ? await updateRewardCapBucket(editing.id, body) : await createRewardCapBucket(body);
      if (res.success) {
        toast.success(editing ? 'Bucket updated' : 'Bucket created');
        setIsCreateOpen(false);
        onChanged();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (bucket: RewardCapBucket) => {
    if (!window.confirm(`Delete bucket "${bucket.name}"?`)) return;
    const res = await deleteRewardCapBucket(bucket.id);
    if (res.success) {
      toast.success('Bucket deleted');
      onChanged();
    } else {
      toast.error(res.error.message);
    }
  };

  const selectTriggerClass =
    'w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none';
  const inputClass =
    'text-xs h-9 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none';

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
          <Layers className="w-3.5 h-3.5 text-sky-500" /> Shared Cap Buckets
        </h2>
        <div className="flex-1" />
        <Button onClick={openCreate} disabled={!accountId} variant="outline" className="rounded-lg h-8 text-xs font-semibold">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Bucket
        </Button>
      </div>

      {buckets.length === 0 ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          No shared buckets. Use one when several rules must share a single ceiling (e.g. Axis ACE’s 5% and 4%
          categories together capped at ₹500/cycle) — then pick the bucket in each rule’s Limits.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {buckets.map((bucket) => (
            <div key={bucket.id}
                 className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{bucket.name}</div>
                <div className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                  {bucket.rewardType === 'POINTS' ? `${bucket.cap} pts` : `₹${bucket.cap}`} / {WINDOW_LABELS[bucket.windowType].replace('Per ', '')}
                  <span className="text-slate-400 dark:text-slate-500 font-medium"> · {bucket.ruleCount} rule{bucket.ruleCount === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="icon" aria-label="Edit bucket" title="Edit"
                        onClick={() => openEdit(bucket)} className="h-7 w-7 rounded-lg">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Delete bucket" title="Delete"
                        onClick={() => void remove(bucket)}
                        className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={(o) => !o && setIsCreateOpen(false)}>
        <DialogContent className="sm:max-w-[400px] p-4">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Cap Bucket' : 'Create Cap Bucket'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="e.g. ACE combined cap" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Cap {rewardType === 'POINTS' ? '(pts)' : '(₹)'}
                </Label>
                <Input inputMode="decimal" value={cap} onChange={(e) => setCap(sanitizeDecimalInput(e.target.value))}
                       placeholder="e.g. 500" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Window</Label>
                <Select value={windowType} onValueChange={(v) => setWindowType(v as CapWindow)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(WINDOW_LABELS) as CapWindow[]).map((w) => (
                      <SelectItem key={w} value={w} className="text-xs">{WINDOW_LABELS[w]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Reward type</Label>
              <Select value={rewardType} onValueChange={(v) => setRewardType(v as RewardType)}>
                <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH" className="text-xs">Cash ₹</SelectItem>
                  <SelectItem value="POINTS" className="text-xs">Reward points</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              The reward type is the cap’s unit — only rules paying that type can share this bucket.
              It can’t be changed while rules still use the bucket.
            </p>
          </div>
          <DialogFooter className="flex gap-2 flex-row">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}
                    className="flex-1 rounded-xl h-9 text-xs font-semibold">Cancel</Button>
            <Button type="button" onClick={save} disabled={isSubmitting}
                    className="flex-1 rounded-xl h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {isSubmitting ? 'Saving...' : 'Save Bucket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

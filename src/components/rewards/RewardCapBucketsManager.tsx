'use client';

import { Layers, Loader2, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useCreateRewardCapBucket,
  useDeleteRewardCapBucket,
  useRewardCapBuckets,
  useUpdateRewardCapBucket,
} from '@/components/rewards/queries/useRewardCapBucketsQueries';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import type { CapWindow, CounterScope, RewardCapBucket, RewardType } from '@/lib/rewards.types';
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
}

/** Shared cap buckets list + CRUD for one account. */
export default function RewardCapBucketsManager({ accountId }: RewardCapBucketsManagerProps) {
  const bucketsQuery = useRewardCapBuckets(accountId);
  const buckets = bucketsQuery.data ?? [];
  const createBucket = useCreateRewardCapBucket();
  const updateBucket = useUpdateRewardCapBucket();
  const deleteBucket = useDeleteRewardCapBucket();

  const [editing, setEditing] = useState<RewardCapBucket | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  const [rewardType, setRewardType] = useState<RewardType>('CASH');
  const [windowType, setWindowType] = useState<CapWindow>('CALENDAR_MONTH');
  const [counterScope, setCounterScope] = useState<CounterScope>('ACCOUNT');

  const errorMessage = (e: unknown, fallback: string) =>
    e instanceof ApiError ? e.response.message : fallback;

  const openCreate = () => {
    setEditing(undefined);
    setName('');
    setCap('');
    setRewardType('CASH');
    setWindowType('CALENDAR_MONTH');
    setCounterScope('ACCOUNT');
    setIsCreateOpen(true);
  };

  const openEdit = (bucket: RewardCapBucket) => {
    setEditing(bucket);
    setName(bucket.name);
    setCap(String(bucket.cap));
    setRewardType(bucket.rewardType);
    setWindowType(bucket.windowType);
    setCounterScope(bucket.counterScope || 'ACCOUNT');
    setIsCreateOpen(true);
  };

  const isSubmitting = createBucket.isPending || updateBucket.isPending;

  const save = () => {
    if (!name.trim()) {
      toast.error('Bucket name is required.');
      return;
    }
    if (!(Number(cap) > 0)) {
      toast.error('Cap must be a positive number.');
      return;
    }
    const body = { accountId, name: name.trim(), cap: Number(cap), rewardType, windowType, counterScope };
    const onSuccess = () => {
      toast.success(editing ? 'Bucket updated' : 'Bucket created');
      setIsCreateOpen(false);
    };
    const onError = (e: unknown) => toast.error(errorMessage(e, 'Failed to save cap bucket'));
    if (editing) {
      updateBucket.mutate({ id: editing.id, body }, { onSuccess, onError });
    } else {
      createBucket.mutate(body, { onSuccess, onError });
    }
  };

  const remove = (bucket: RewardCapBucket) => {
    if (!window.confirm(`Delete bucket "${bucket.name}"?`)) return;
    deleteBucket.mutate(bucket.id, {
      onSuccess: () => toast.success('Bucket deleted'),
      onError: (e) => toast.error(errorMessage(e, 'Failed to delete cap bucket')),
    });
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
        {bucketsQuery.isFetching && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />
        )}
        <div className="flex-1" />
        <Button onClick={openCreate} disabled={!accountId} variant="outline" size="sm">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Bucket
        </Button>
      </div>

      {buckets.length === 0 && !bucketsQuery.isFetching ? (
        <EmptyState
          compact
          icon={Layers}
          title="No shared buckets"
          description="Use one when several rules must share a single ceiling (e.g. Axis ACE’s 5% and 4% categories together capped at ₹500/cycle) — then pick the bucket in each rule’s Limits."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {buckets.map((bucket) => (
            <div key={bucket.id}
                 className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{bucket.name}</div>
                <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                  {bucket.rewardType === 'POINTS' ? `${bucket.cap} pts` : `₹${bucket.cap}`} / {WINDOW_LABELS[bucket.windowType].replace('Per ', '')}
                  {bucket.counterScope === 'PER_CARDHOLDER' && <span className="text-amber-600 dark:text-amber-400 font-bold"> (per cardholder)</span>}
                  <span className="text-slate-400 dark:text-slate-500 font-medium"> · {bucket.ruleCount} rule{bucket.ruleCount === 1 ? '' : 's'}</span>
                </div>
              </div>

              {/* Actions 3-dot dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs" aria-label="Bucket actions">
                    <MoreVertical className="w-4 h-4 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => openEdit(bucket)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Bucket
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => remove(bucket)}
                    className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600 dark:text-rose-400" /> Delete Bucket
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={(o) => !o && setIsCreateOpen(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Cap Bucket' : 'Create Cap Bucket'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-2.5">
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
            <div className="grid grid-cols-2 gap-2.5">
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
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Counter scope</Label>
                <Select value={counterScope} onValueChange={(v) => setCounterScope(v as CounterScope)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCOUNT" className="text-xs">Per account (pooled)</SelectItem>
                    <SelectItem value="PER_CARDHOLDER" className="text-xs">Per cardholder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-2xs text-slate-400 dark:text-slate-500">
              The reward type is the cap’s unit — only rules paying that type can share this bucket.
              It can’t be changed while rules still use the bucket.
            </p>
          </DialogBody>
          <DialogFooter
            primaryAction={{
              label: isSubmitting ? 'Saving...' : 'Save Bucket',
              onClick: save,
              disabled: isSubmitting,
            }}
            secondaryAction={{
              label: 'Cancel',
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

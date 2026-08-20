'use client';

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
} from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { recommendCards } from '@/actions/rewards';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import {
  REASON_META,
  type RewardRecommendationResponse,
} from '@/lib/rewards.types';
import { TransactionChannel } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney, toCalendarDate } from '@/lib/utils';

interface RecommendSimulatorProps {
  categories: Category[];
  accounts: Account[];
}

export default function RecommendSimulator({ categories, accounts }: RecommendSimulatorProps) {
  const [amount, setAmount] = useState<string>('5000');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [mcc, setMcc] = useState<string>('');

  const [merchantText, setMerchantText] = useState<string>('');
  const [channel, setChannel] = useState<string>('ALL');
  const [isEmi, setIsEmi] = useState<boolean>(false);
  const [isIntl, setIsIntl] = useState<boolean>(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);


  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RewardRecommendationResponse | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const amountId = useId();
  const dateId = useId();
  const mccId = useId();
  const merchantId = useId();
  const channelId = useId();


  const handleSimulate = async () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid spend amount greater than ₹0');
      return;
    }

    setLoading(true);
    try {
      const res = await recommendCards({
        amount: numericAmount,
        date: toCalendarDate(date),
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        mcc: mcc.trim() ? mcc.trim() : undefined,
        merchantText: merchantText.trim() ? merchantText.trim() : undefined,
        channel: channel !== 'ALL' ? (channel as TransactionChannel) : undefined,
        isEmi,
        isIntl,
        accountIds: selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
      });

      if (res.success) {
        setResult(res.data);
        if (res.data.recommendations.length > 0) {
          setExpandedCards({ [res.data.recommendations[0].accountId]: true });
        }
      } else {
        toast.error(res.error.message || 'Failed to simulate card rewards');
      }
    } catch {
      toast.error('An unexpected error occurred during simulation');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountId: string) => {
    setExpandedCards((prev) => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  };


  const creditCards = accounts.filter((a) => a.type === 'credit_card');

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );


  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Form Column */}
        <Card className="lg:col-span-1 rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-3.5 space-y-3">
            <div className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
              Planned Spend
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor={amountId} className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                Amount (₹) *
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₹</span>
                <Input
                  id={amountId}
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className="pl-6 h-8 text-xs font-medium"
                />
              </div>
            </div>

            {/* Merchant / Description */}
            <div className="space-y-1.5">
              <Label htmlFor={merchantId} className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                Merchant / Pattern
              </Label>
              <Input
                id={merchantId}
                type="text"
                value={merchantText}
                onChange={(e) => setMerchantText(e.target.value)}
                placeholder="e.g. Swiggy, Amazon..."
                className="h-8 text-xs"
              />
            </div>

            {/* Channel & Date */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor={channelId} className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  Channel
                </Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger id={channelId} className="h-8 text-xs">
                    <SelectValue placeholder="All Channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Any / All</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="POS">POS / In-Store</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CONTACTLESS">Contactless</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={dateId} className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  Purchase Date
                </Label>
                <DatePicker
                  date={date}
                  onSelect={(d) => d && setDate(d)}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{date ? formatDate(toCalendarDate(date)) : 'Pick date'}</span>
                    </Button>
                  }
                />
              </div>
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  Categories ({selectedCategoryIds.length} selected)
                </Label>
                {selectedCategoryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryIds([])}
                    className="text-2xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Input
                type="text"
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="h-7 text-xs"
              />
              <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/50">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center space-x-2 text-xs">
                    <Checkbox
                      id={`cat-${cat.id}`}
                      checked={selectedCategoryIds.includes(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    <label
                      htmlFor={`cat-${cat.id}`}
                      className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none truncate"
                    >
                      {cat.name}
                    </label>
                  </div>
                ))}
                {filteredCategories.length === 0 && (
                  <p className="text-xs text-slate-400 italic">
                    {categorySearchQuery ? 'No matching categories' : 'No categories available'}
                  </p>
                )}
              </div>
            </div>


            {/* MCC */}
            <div className="space-y-1.5">
              <Label htmlFor={mccId} className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                MCC (Optional)
              </Label>
              <Input
                id={mccId}
                type="text"
                value={mcc}
                onChange={(e) => setMcc(e.target.value)}
                placeholder="e.g. 5411, 5812..."
                className="h-8 text-xs"
              />
            </div>

            {/* EMI & International Toggles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="emi-toggle" checked={isEmi} onCheckedChange={(c) => setIsEmi(!!c)} />
                <Label htmlFor="emi-toggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  EMI Transaction
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="intl-toggle" checked={isIntl} onCheckedChange={(c) => setIsIntl(!!c)} />
                <Label htmlFor="intl-toggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  International
                </Label>
              </div>
            </div>

            {/* Compare Cards Multi-Select */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  Compare Cards ({selectedAccountIds.length === 0 ? 'All Cards' : `${selectedAccountIds.length} selected`})
                </Label>
                {selectedAccountIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAccountIds([])}
                    className="text-2xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
                  >
                    Clear (All Cards)
                  </button>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/50">
                {creditCards.map((card) => (
                  <div key={card.id} className="flex items-center space-x-2 text-xs">
                    <Checkbox
                      id={`card-${card.id}`}
                      checked={selectedAccountIds.includes(card.id)}
                      onCheckedChange={() => toggleAccount(card.id)}
                    />
                    <label
                      htmlFor={`card-${card.id}`}
                      className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none truncate"
                    >
                      {card.name}
                    </label>
                  </div>
                ))}
                {creditCards.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No credit cards available</p>
                )}
              </div>
            </div>


            {/* Submit Button */}
            <Button
              onClick={handleSimulate}
              disabled={loading}
              size="sm"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Evaluating...
                </>
              ) : (
                'Rank cards'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-3">
          {!result && !loading && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6 text-center">
              <p className="text-xs text-slate-500">
                Enter spend details on the left and click <span className="font-semibold text-slate-700 dark:text-slate-300">Rank cards</span> to simulate rewards across your cards.
              </p>
            </Card>
          )}

          {loading && (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6 text-center flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              <span className="text-xs text-slate-500">Simulating card rewards...</span>
            </Card>
          )}

          {result && !loading && (
            <div className="space-y-2.5">
              {/* Header Summary Bar */}
              <div className="flex items-center justify-between px-1">
                <span className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                  {result.recommendations.length} card{result.recommendations.length === 1 ? '' : 's'} evaluated
                </span>
                <span className="text-2xs text-slate-400 font-mono">
                  Spend: {formatMoney(result.input.amount)}
                </span>
              </div>

              {/* Recommendation Cards List */}
              <div className="space-y-2.5">
                {result.recommendations.map((card) => {
                  const isExpanded = !!expandedCards[card.accountId];
                  const isBest = card.rank === 1;

                  return (
                    <Card
                      key={card.accountId}
                      className={cn(
                        'rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm transition-all',
                        isBest && 'border-emerald-200 dark:border-emerald-900/50'
                      )}
                    >
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          {/* Left Info */}
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-400">
                                #{card.rank}
                              </span>
                              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                {card.accountName}
                              </h3>
                              {isBest && (
                                <span className="text-2xs uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400">
                                  Best
                                </span>
                              )}
                            </div>
                            <div className="text-2xs text-slate-400">
                              Guaranteed {formatMoney(card.guaranteedValueInr)}
                              {card.milestoneValueInr > 0 && ` + Milestone ${formatMoney(card.milestoneValueInr)}`}
                            </div>
                          </div>

                          {/* Right Return & Action */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(card.totalValueInr)}
                              </div>
                              <div className="text-2xs text-slate-400 font-medium">
                                {card.effectiveRatePct}%
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => toggleExpand(card.accountId)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Notice Banners */}
                        {card.pointValueSource === 'DEFAULT' && card.pointsValued && (
                          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 shrink-0" />
                            <span>Assumed {formatMoney(card.pointValueInr)}/pt — set point value in rewards config</span>
                          </div>
                        )}
                        {card.cycleFallback && (
                          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            <span>Statement cycle fallback active</span>
                          </div>
                        )}
                        {card.noRulesConfigured && (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>No reward rules configured</span>
                          </div>
                        )}

                        {/* Expanded Detail Panel */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                            {/* Rule Lines */}
                            <div className="space-y-1.5">
                              <div className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                                Rule Breakdown
                              </div>
                              <div className="space-y-1.5">
                                {card.ruleLines.map((line, lIdx) => {
                                  const reasonMeta = REASON_META[line.reason] || { label: line.reason, textClass: 'text-slate-500' };
                                  return (
                                    <div
                                      key={lIdx}
                                      className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                    >
                                      <div className="space-y-0.5 min-w-0">
                                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                          {line.ruleName || 'Base Rule Evaluation'}
                                          {line.stacking && (
                                            <span className="ml-1.5 px-1 py-0.2 rounded text-2xs bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                              {line.stacking}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-slate-500">
                                          Outcome:{' '}
                                          <span className={reasonMeta.textClass}>
                                            {reasonMeta.label}
                                          </span>
                                        </div>
                                        {line.capStatus && (
                                          <div className="text-2xs text-slate-400 pt-0.5">
                                            <span>
                                              Cap headroom {formatMoney(line.capStatus.capRemainingBefore)} of {formatMoney(line.capStatus.totalCap)}
                                              {line.capStatus.bucketName ? ` (shared: ${line.capStatus.bucketName})` : ''}
                                              {line.capStatus.windowEnd ? ` · window ends ${formatDate(line.capStatus.windowEnd)}` : ''}
                                            </span>
                                            <div className="mt-1 h-1.5 max-w-44 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                              <div
                                                className={cn(
                                                  'h-full rounded-full',
                                                  line.capStatus.capRemainingBefore <= 0
                                                    ? 'bg-rose-400'
                                                    : 'bg-emerald-500'
                                                )}
                                                style={{
                                                  width: `${Math.min(100, Math.max(0, (line.capStatus.capRemainingBefore / line.capStatus.totalCap) * 100))}%`,
                                                }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="text-right shrink-0">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">
                                          {line.earnedUnit === 'POINTS' ? `${line.earned} pts` : formatMoney(line.earned)}
                                        </div>
                                        {line.earnedUnit === 'POINTS' && (
                                          <div className="text-2xs text-slate-400">
                                            = {formatMoney(line.earnedValueInr)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {card.ruleLines.length === 0 && (
                                  <p className="text-xs text-slate-400 italic">No matching rule lines.</p>
                                )}
                              </div>
                            </div>

                            {/* Milestone Statuses */}
                            {card.milestones.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
                                  Milestone Proximity & Crossings
                                </div>
                                <div className="space-y-1.5">
                                  {card.milestones.map((m) => (
                                    <div
                                      key={m.milestoneId}
                                      className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 text-xs space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                                          {m.crosses && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 inline mr-1" />}
                                          {m.name}
                                        </div>
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                          +{formatMoney(m.scoredValueInr)}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap justify-between text-2xs text-slate-400">
                                        <span>
                                          Progress: {formatMoney(m.progress)} / {formatMoney(m.threshold)}
                                        </span>
                                        {m.crosses ? (
                                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            Crosses threshold on this spend!
                                          </span>
                                        ) : (
                                          <span>
                                            {formatMoney(m.remainingToThreshold)} to go — valued at {formatMoney(m.scoredValueInr)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { CalendarDays, Loader2 } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { formatDate, toCalendarDate } from '@/lib/utils';

import { CategorySelectPicker } from './CategorySelectPicker';
import { CompareCardsPicker } from './CompareCardsPicker';

interface SimulatorFormProps {
  categories: Category[];
  accounts: Account[];
  amount: string;
  setAmount: (a: string) => void;
  merchantText: string;
  setMerchantText: (m: string) => void;
  channel: string;
  setChannel: (c: string) => void;
  date: Date;
  setDate: (d: Date) => void;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  categorySearchQuery: string;
  setCategorySearchQuery: (q: string) => void;
  mcc: string;
  setMcc: (m: string) => void;
  isEmi: boolean;
  setIsEmi: React.Dispatch<React.SetStateAction<boolean>>;
  isIntl: boolean;
  setIsIntl: React.Dispatch<React.SetStateAction<boolean>>;
  selectedAccountIds: string[];
  setSelectedAccountIds: React.Dispatch<React.SetStateAction<string[]>>;
  loading: boolean;
  onSimulate: () => void;
}

export function SimulatorForm({
  categories,
  accounts,
  amount,
  setAmount,
  merchantText,
  setMerchantText,
  channel,
  setChannel,
  date,
  setDate,
  selectedCategoryIds,
  setSelectedCategoryIds,
  categorySearchQuery,
  setCategorySearchQuery,
  mcc,
  setMcc,
  isEmi,
  setIsEmi,
  isIntl,
  setIsIntl,
  selectedAccountIds,
  setSelectedAccountIds,
  loading,
  onSimulate,
}: SimulatorFormProps) {
  const amountId = useId();
  const dateId = useId();
  const mccId = useId();
  const merchantId = useId();
  const channelId = useId();

  return (
    <Card className="lg:col-span-1 rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
      <CardContent className="p-3.5 space-y-3">
        <div className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
          Planned Spend
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label
            htmlFor={amountId}
            className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500"
          >
            Amount (₹) *
          </Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
              ₹
            </span>
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
          <Label
            htmlFor={merchantId}
            className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500"
          >
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
            <Label
              htmlFor={channelId}
              className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500"
            >
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
            <Label
              htmlFor={dateId}
              className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500"
            >
              Purchase Date
            </Label>
            <DatePicker
              date={date}
              onSelect={(d) => d && setDate(d)}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {date ? formatDate(toCalendarDate(date)) : 'Pick date'}
                  </span>
                </Button>
              }
            />
          </div>
        </div>

        {/* Category Select */}
        <CategorySelectPicker
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          setSelectedCategoryIds={setSelectedCategoryIds}
          categorySearchQuery={categorySearchQuery}
          setCategorySearchQuery={setCategorySearchQuery}
        />

        {/* MCC */}
        <div className="space-y-1.5">
          <Label
            htmlFor={mccId}
            className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500"
          >
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
            <Checkbox
              id="emi-toggle"
              checked={isEmi}
              onCheckedChange={(c) => setIsEmi(!!c)}
            />
            <Label
              htmlFor="emi-toggle"
              className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              EMI Transaction
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="intl-toggle"
              checked={isIntl}
              onCheckedChange={(c) => setIsIntl(!!c)}
            />
            <Label
              htmlFor="intl-toggle"
              className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              International
            </Label>
          </div>
        </div>

        {/* Compare Cards Multi-Select */}
        <CompareCardsPicker
          accounts={accounts}
          selectedAccountIds={selectedAccountIds}
          setSelectedAccountIds={setSelectedAccountIds}
        />

        {/* Submit Button */}
        <Button
          onClick={onSimulate}
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
  );
}

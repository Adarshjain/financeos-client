'use client';

import React from 'react';

import { Combobox } from '@/components/Combobox';
import { MccInput } from '@/components/forms/MccInput';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Category } from '@/lib/categories.types';
import { CategoryRule, MatchType } from '@/lib/rules.types';

import { MATCH_TYPE_META } from './RuleCard';

export function validatePattern(
  matchType: MatchType,
  pattern: string
): string | null {
  const trimmed = pattern.trim();
  if (matchType === 'MERCHANT_KEY') {
    if (trimmed.replace(/[^a-zA-Z]/g, '').length < 3) {
      return 'Merchant key must contain at least 3 letters (ignoring numbers, spaces, and punctuation).';
    }
  } else if (matchType === 'CONTAINS' || matchType === 'STARTS_WITH') {
    if (trimmed.length < 3) return 'Pattern must be at least 3 characters.';
  } else if (matchType === 'EXACT') {
    if (trimmed.length === 0) return 'Pattern must not be empty.';
  } else if (matchType === 'REGEX') {
    if (trimmed.length === 0) return 'Pattern must not be empty.';
    if (trimmed.length > 200)
      return 'Regex pattern must be at most 200 characters.';
    try {
      new RegExp(trimmed, 'i');
    } catch {
      return 'Invalid regular expression.';
    }
  }
  if (trimmed.length > 255) return 'Pattern must be at most 255 characters.';
  return null;
}

interface RuleFormDialogProps {
  open: boolean;
  editingRule: CategoryRule | null;
  onClose: () => void;
  matchType: MatchType;
  setMatchType: (m: MatchType) => void;
  merchantKey: string;
  setMerchantKey: (k: string) => void;
  displayName: string;
  setDisplayName: (n: string) => void;
  mcc: string;
  setMcc: (m: string) => void;
  localCategories: Category[];
  selectedCategories: Category[];
  setSelectedCategories: (c: Category[]) => void;
  onCreateCategory: (name: string) => void;
  creatingCategory: boolean;
  formSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function RuleFormDialog({
  open,
  editingRule,
  onClose,
  matchType,
  setMatchType,
  merchantKey,
  setMerchantKey,
  displayName,
  setDisplayName,
  mcc,
  setMcc,
  localCategories,
  selectedCategories,
  setSelectedCategories,
  onCreateCategory,
  creatingCategory,
  formSubmitting,
  onSubmit,
}: RuleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? 'Edit Rule' : 'Create Categorization Rule'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="rule-form" onSubmit={onSubmit} className="space-y-3">
            {/* Match Type + Pattern */}
            <div className="space-y-1">
              <Label htmlFor="matchType">Match Type</Label>
              <Select
                value={matchType}
                onValueChange={(value) => setMatchType(value as MatchType)}
              >
                <SelectTrigger id="matchType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MATCH_TYPE_META) as MatchType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {MATCH_TYPE_META[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="merchantKey">Pattern (Merchant Key)</Label>
              <Input
                id="merchantKey"
                value={merchantKey}
                onChange={(e) => setMerchantKey(e.target.value)}
                placeholder="e.g. SWIGGY or STARBUCKS"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Swiggy Food Delivery"
              />
            </div>

            {/* MCC Code Input */}
            <MccInput value={mcc} onChange={setMcc} />

            {/* Category Combobox */}
            <div className="space-y-1">
              <Label>Categories</Label>
              <Combobox
                options={localCategories}
                value={selectedCategories}
                onChange={setSelectedCategories}
                canCreate
                onCreate={onCreateCategory}
                loading={creatingCategory}
                placeholder="Select categories..."
                className="w-full space-y-1.5"
              />
              <p className="text-2xs text-slate-400 dark:text-slate-500">
                Select one or more categories for this rule. Create a new
                category by typing it in search and clicking create.
              </p>
            </div>
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: formSubmitting ? 'Saving...' : 'Save',
            type: 'submit',
            form: 'rule-form',
            disabled: formSubmitting || creatingCategory,
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: onClose,
            disabled: formSubmitting,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

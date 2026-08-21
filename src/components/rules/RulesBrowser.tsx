'use client';

import { Check, Edit, ListChecks, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { usePathname,useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { createCategory } from '@/actions/categories';
import { createRule, deleteRule, updateRule, verifyRule } from '@/actions/rules';
import { Combobox } from '@/components/Combobox';
import { isValidMcc,MccInput } from '@/components/forms/MccInput';
import { JobsPanel } from '@/components/jobs/JobsPanel';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { RuleMatchesDialog } from '@/components/rules/RuleMatchesDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category } from '@/lib/categories.types';
import { CategoryRule, MatchType, PagedRules } from '@/lib/rules.types';
import { cn, formatRelativeTime } from '@/lib/utils';

const MATCH_TYPE_META: Record<MatchType, { label: string; chip: string; placeholder: string; help: string }> = {
  MERCHANT_KEY: {
    label: 'Merchant key (smart contains)',
    chip: 'Key',
    placeholder: 'e.g. STARBUCKS',
    help: 'Matches descriptions containing this text after cleanup — numbers, punctuation, and noise words (UPI, POS…) are ignored. At least 3 letters.',
  },
  CONTAINS: {
    label: 'Contains text',
    chip: 'Contains',
    placeholder: 'e.g. UPI-AUTOPAY/042',
    help: 'Matches descriptions containing this exact text anywhere, case-insensitively. Numbers and punctuation count.',
  },
  STARTS_WITH: {
    label: 'Starts with',
    chip: 'Starts with',
    placeholder: 'e.g. ACH/',
    help: 'Matches descriptions beginning with this exact text, case-insensitively.',
  },
  EXACT: {
    label: 'Exact match',
    chip: 'Exact',
    placeholder: 'e.g. NEFT SALARY CREDIT',
    help: 'Matches only descriptions that are exactly this text, case-insensitively.',
  },
  REGEX: {
    label: 'Regex',
    chip: 'Regex',
    placeholder: 'e.g. NEFT.*(HDFC|ICICI)',
    help: 'Matches descriptions where this regular expression finds a match, case-insensitively. Max 200 characters.',
  },
};

function validatePattern(matchType: MatchType, pattern: string): string | null {
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
    if (trimmed.length > 200) return 'Regex pattern must be at most 200 characters.';
    try {
      new RegExp(trimmed, 'i');
    } catch {
      return 'Invalid regular expression.';
    }
  }
  if (trimmed.length > 255) return 'Pattern must be at most 255 characters.';
  return null;
}

interface RulesBrowserProps {
  initialRules: PagedRules;
  categories: Category[];
  initialVerified: string;
  initialSearch: string;
}

export function RulesBrowser({
  initialRules,
  categories,
  initialVerified,
  initialSearch,
}: RulesBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filter & Search states
  const [searchVal, setSearchVal] = useState(initialSearch);
  const [activeTab, setActiveTab] = useState(initialVerified);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);
  const [matchesRule, setMatchesRule] = useState<CategoryRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<CategoryRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form States
  const [merchantKey, setMerchantKey] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('MERCHANT_KEY');
  const [displayName, setDisplayName] = useState('');
  const [mcc, setMcc] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Category search/creation list state
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // Sync state with url if it changes
  useEffect(() => {
    setSearchVal(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setActiveTab(initialVerified);
  }, [initialVerified]);

  const updateQueryParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [searchParams, pathname, router]);

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchVal !== initialSearch) {
        updateQueryParams({
          search: searchVal ? searchVal : null,
          page: '0',
        });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal, initialSearch, updateQueryParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    updateQueryParams({
      verified: tab === 'all' ? 'all' : tab,
      page: '0',
    });
  };

  const handlePageChange = (newPage: number) => {
    updateQueryParams({
      page: String(newPage),
    });
  };

  const handleSizeChange = (newSize: number) => {
    updateQueryParams({
      size: String(newSize),
      page: '0',
    });
  };

  // Inline category creation
  const handleCreateCategory = async (name: string) => {
    setCreatingCategory(true);
    try {
      const res = await createCategory(name);
      if (res.success) {
        setLocalCategories((prev) => [...prev, res.data]);
        setSelectedCategories((prev) => [...prev, res.data]);
        toast.success('Category created!');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  // Open Create Dialog
  const openCreateDialog = () => {
    setMerchantKey('');
    setMatchType('MERCHANT_KEY');
    setDisplayName('');
    setMcc('');
    setSelectedCategories([]);
    setIsCreateOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (rule: CategoryRule) => {
    setEditingRule(rule);
    setMerchantKey(rule.merchantKey);
    setMatchType(rule.matchType || 'MERCHANT_KEY');
    setDisplayName(rule.displayName || '');
    setMcc(rule.mcc || '');
    setSelectedCategories(rule.categories);
  };

  // Close Dialogs
  const closeDialogs = () => {
    setIsCreateOpen(false);
    setEditingRule(null);
  };

  // Submit Create/Edit Rule Form
  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations (server re-validates authoritatively)
    const patternError = validatePattern(matchType, merchantKey);
    if (patternError) {
      toast.error(patternError);
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error('At least one category must be selected.');
      return;
    }

    if (!isValidMcc(mcc)) {
      toast.error('MCC code must be exactly 4 digits (or left empty).');
      return;
    }

    setFormSubmitting(true);
    const categoryIds = selectedCategories.map((c) => c.id);

    try {
      if (editingRule) {
        const res = await updateRule(editingRule.id, {
          merchantKey: merchantKey.trim(),
          matchType,
          displayName: displayName.trim() || undefined,
          categoryIds,
          mcc: mcc.trim() === '' ? '' : mcc.trim(),
        });

        if (res.success) {
          toast.success('Rule updated successfully!');
          closeDialogs();
          router.refresh();
        } else {
          toast.error(res.error.message);
        }
      } else {
        const res = await createRule({
          merchantKey: merchantKey.trim(),
          matchType,
          displayName: displayName.trim() || undefined,
          categoryIds,
          mcc: mcc.trim() || undefined,
        });

        if (res.success) {
          toast.success('Rule created successfully!');
          closeDialogs();
          router.refresh();
        } else {
          // Handle 409 conflict duplicate key
          if (
            res.error.code === 'CONFLICT' ||
            res.error.message.toLowerCase().includes('already exists') ||
            res.error.message.toLowerCase().includes('duplicate')
          ) {
            toast.error('Merchant rule already exists for this key.');
          } else {
            toast.error(res.error.message);
          }
        }
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Rule Action (confirmed via dialog)
  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    setIsDeleting(true);
    try {
      const res = await deleteRule(deletingRule.id);
      if (res.success) {
        toast.success('Rule deleted successfully');
        setDeletingRule(null);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('Failed to delete rule.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Verify Rule Action
  const handleVerifyRule = async (id: string) => {
    try {
      const res = await verifyRule(id);
      if (res.success) {
        toast.success('Rule verified — matching transactions cleared from review');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('Failed to verify rule.');
    }
  };

  return (
    <div className="space-y-2 p-4 pb-32">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Categorization Rules</h1>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4" />
          <span>New Rule</span>
        </Button>
      </div>


      {/* Rules list content */}
      {isPending && (
        <div className="text-center py-10 text-slate-400">
          <p className="text-sm">Refreshing rules list...</p>
        </div>
      )}

      {!isPending && initialRules.content.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-6">
          <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">No categorization rules found</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Transactions you ingest will generate rules automatically — or click &quot;New Rule&quot; to create one manually.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {initialRules.content.map((rule) => (
              <div
                key={rule.id}
                className="relative rounded-2xl border border-slate-200/50 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 p-3 shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Header Info */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="text-slate-900 dark:text-white truncate">
                        {rule.displayName || rule.merchantKey}
                      </h3>
                      {(rule.displayName || rule.matchType !== 'MERCHANT_KEY') && (
                        <span className="text-2xs tabular-nums px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 mt-1 block w-fit font-medium">
                          {(MATCH_TYPE_META[rule.matchType] || MATCH_TYPE_META.MERCHANT_KEY).chip}: {rule.merchantKey}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Badge
                        variant={rule.verified ? 'success' : 'warning'}
                        className="text-2xs font-bold px-2 py-0.5 rounded-md"
                      >
                        {rule.verified ? 'Verified' : 'Unverified'}
                      </Badge>
                      <Badge
                        variant={rule.source === 'LLM' ? 'info' : 'secondary'}
                        className="text-2xs font-bold px-2 py-0.5 rounded-md"
                      >
                        {rule.source}
                      </Badge>
                      {rule.mcc && (
                        <span className="text-2xs tabular-nums px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                          MCC: {rule.mcc}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rule.categories.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No categories</span>
                    ) : (
                      rule.categories.map((c) => (
                        <Badge
                          key={c.id}
                          variant="outline"
                          className="rounded-full px-2.5 py-0 text-2xs border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                        >
                          {c.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer and Actions */}
                <div className="flex items-center justify-between pt-3 text-xs">
                  <div className="text-slate-400 dark:text-slate-500 space-y-0.5">
                    <div>Used {rule.appliedCount}×</div>
                    <div className="text-2xs">
                      Last active: {formatRelativeTime(rule.lastAppliedAt)}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Rule actions">
                        <MoreVertical className="h-4 w-4 text-slate-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setMatchesRule(rule)}>
                        <ListChecks className="w-3.5 h-3.5 mr-2" /> Find Matches
                      </DropdownMenuItem>
                      {!rule.verified && (
                        <DropdownMenuItem onClick={() => void handleVerifyRule(rule.id)}>
                          <Check className="w-3.5 h-3.5 mr-2" /> Approve Rule
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                        <Edit className="w-3.5 h-3.5 mr-2" /> Edit Rule
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletingRule(rule)}
                        className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600 dark:text-rose-400" /> Delete Rule
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
        </>
      )}

      <JobsPanel types={['RULE_APPLY']} title="Recent rule application jobs" />

      <PageActionBar>
        {/*<div className="flex flex-col gap-1">*/}
        {/* Tabs and Search Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Toggle Chips/Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
            {[
              { id: 'false', label: 'Unverified' },
              { id: 'true', label: 'Verified' },
              { id: 'all', label: 'All' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                  <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                          'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200',
                          isActive
                              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                      )}
                  >
                    {tab.label}
                  </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
                placeholder="Search merchant keys or display names..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="pl-9 pr-4 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500 focus-visible:border-transparent transition-all"
            />
          </div>
          {/*</div>*/}
          <TablePagination
              page={{
                number: initialRules.number,
                size: initialRules.size,
                totalElements: initialRules.totalElements,
                totalPages: initialRules.totalPages,
              }}
              loading={isPending}
              onPageChange={handlePageChange}
              onSizeChange={handleSizeChange}
              unit="rule"
              className="w-full px-1"
          />
        </div>
      </PageActionBar>

      <Dialog open={isCreateOpen || !!editingRule} onOpenChange={closeDialogs}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Categorization Rule'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="rule-form" onSubmit={handleSubmitRule} className="space-y-3">
              {/* Match Type + Pattern */}
              <div className="space-y-1">
                <Label htmlFor="matchType">Match Type</Label>
                <Select value={matchType} onValueChange={(value) => setMatchType(value as MatchType)}>
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
              <MccInput
                value={mcc}
                onChange={setMcc}
              />

              {/* Category Combobox */}
              <div className="space-y-1">
                <Label>Categories</Label>
                <Combobox
                  options={localCategories}
                  value={selectedCategories}
                  onChange={setSelectedCategories}
                  canCreate
                  onCreate={handleCreateCategory}
                  loading={creatingCategory}
                  placeholder="Select categories..."
                  className="w-full space-y-1.5"
                />
                <p className="text-2xs text-slate-400 dark:text-slate-500">
                  Select one or more categories for this rule. Create a new category by typing it in search and clicking create.
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
              onClick: closeDialogs,
              disabled: formSubmitting,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingRule}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingRule(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule?</DialogTitle>
            <DialogDescription>
              Transactions already categorized by this rule keep their categories.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter
            primaryAction={{
              label: isDeleting ? 'Deleting...' : 'Delete',
              variant: 'destructive',
              onClick: handleDeleteRule,
              disabled: isDeleting,
            }}
            secondaryAction={{
              label: 'Cancel',
              disabled: isDeleting,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Matching Transactions Dialog */}
      {matchesRule && (
        <RuleMatchesDialog
          rule={matchesRule}
          open={!!matchesRule}
          onOpenChange={(open) => {
            if (!open) setMatchesRule(null);
          }}
        />
      )}
    </div>
  );
}

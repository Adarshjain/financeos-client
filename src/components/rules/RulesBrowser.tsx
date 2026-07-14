'use client';

import { formatDistanceToNow } from 'date-fns';
import { Check, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { usePathname,useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { createCategory } from '@/actions/categories';
import { createRule, deleteRule, updateRule, verifyRule } from '@/actions/rules';
import { Combobox } from '@/components/Combobox';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MccInput, isValidMcc } from '@/components/forms/MccInput';
import { Category } from '@/lib/categories.types';
import { CategoryRule, PagedRules } from '@/lib/rules.types';
import { cn } from '@/lib/utils';

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

  // Form States
  const [merchantKey, setMerchantKey] = useState('');
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
    setDisplayName('');
    setMcc('');
    setSelectedCategories([]);
    setIsCreateOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (rule: CategoryRule) => {
    setEditingRule(rule);
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

    // Client-side validations
    if (!editingRule) {
      const normalizedKey = merchantKey.replace(/[^a-zA-Z]/g, '');
      if (normalizedKey.length < 3) {
        toast.error('Merchant key must contain at least 3 letters (ignoring numbers, spaces, and punctuation).');
        return;
      }
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

  const formatRelativeTime = (dateStr: string | null): string => {
    if (!dateStr) return 'never';
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'never';
    }
  };

  return (
    <div className="space-y-4 p-4 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Categorization Rules</h1>
          <p className="text-sm text-slate-500 mt-1">Map merchant names to categories automatically.</p>
        </div>
        <Button onClick={openCreateDialog} className="rounded-xl flex items-center gap-1.5 font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          <Plus className="h-4 w-4" />
          <span>New Rule</span>
        </Button>
      </div>

      {/* Tabs and Search Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialRules.content.map((rule) => (
              <div
                key={rule.id}
                className="relative rounded-2xl border border-slate-200/50 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 p-5 shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between gap-4"
              >
                {/* Header Info */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">
                        {rule.displayName || rule.merchantKey}
                      </h3>
                      {rule.displayName && (
                        <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 mt-1 block w-fit">
                          Key: {rule.merchantKey}
                        </code>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Badge
                        variant={rule.verified ? 'success' : 'warning'}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                      >
                        {rule.verified ? 'Verified' : 'Unverified'}
                      </Badge>
                      <Badge
                        variant={rule.source === 'LLM' ? 'info' : 'secondary'}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                      >
                        {rule.source}
                      </Badge>
                      {rule.mcc && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
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
                          className="rounded-full px-2.5 py-0 text-[10px] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                        >
                          {c.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer and Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-850 text-xs">
                  <div className="text-slate-400 dark:text-slate-500 space-y-0.5">
                    <div>Used {rule.appliedCount}×</div>
                    <div className="text-[10px]">
                      Last active: {formatRelativeTime(rule.lastAppliedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Verify Action */}
                    {!rule.verified && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVerifyRule(rule.id)}
                        className="h-8 w-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg"
                        title="Verify Rule"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Edit Action */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(rule)}
                      className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      title="Edit Rule"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {/* Delete Action */}
                    <ConfirmationDialog
                      title="Delete Rule?"
                      description="Transactions already categorized by this rule keep their categories."
                      primaryActionText="Delete"
                      primaryAction={async () => {
                        const res = await deleteRule(rule.id);
                        if (res.success) {
                          toast.success('Rule deleted successfully');
                          router.refresh();
                        } else {
                          toast.error(res.error.message);
                        }
                      }}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-650 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                          title="Delete Rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <TablePagination
              page={{
                number: initialRules.number,
                size: initialRules.size,
                totalElements: initialRules.totalElements,
                totalPages: initialRules.totalPages,
              }}
              onPageChange={handlePageChange}
              onSizeChange={handleSizeChange}
              unit="rule"
            />
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isCreateOpen || !!editingRule} onOpenChange={closeDialogs}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleSubmitRule} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Categorization Rule'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {/* Merchant Key Input (Create only) */}
              {!editingRule && (
                <div className="space-y-1">
                  <Label htmlFor="merchantKey">Merchant Key</Label>
                  <Input
                    id="merchantKey"
                    placeholder="e.g. STARBUCKS"
                    value={merchantKey}
                    onChange={(e) => setMerchantKey(e.target.value)}
                    required
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Matches any transaction whose description contains this text — numbers and punctuation are ignored. Must contain at least 3 letters.
                  </p>
                </div>
              )}

              {/* Display Name Input */}
              <div className="space-y-1">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  placeholder="e.g. Starbucks Coffee"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
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
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Select one or more categories for this rule. Create a new category by typing it in search and clicking create.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeDialogs} disabled={formSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={formSubmitting || creatingCategory} className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                {formSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

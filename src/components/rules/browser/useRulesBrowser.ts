'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { isValidMcc } from '@/components/forms/MccInput';
import { api, ApiError } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import type { Category } from '@/lib/categories.types';
import { useCategories } from '@/lib/query/hooks/useCategories';
import { keys } from '@/lib/query/keys';
import type { CategoryRule, MatchType, PagedRules } from '@/lib/rules.types';

import { RULES_PAGE_SIZE } from './constants';
import { validatePattern } from './RuleFormDialog';

const EMPTY_RULES_PAGE: PagedRules = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: RULES_PAGE_SIZE,
  number: 0,
  first: true,
  last: true,
  empty: true,
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.response.message : fallback;
}

export function useRulesBrowser() {
  const queryClient = useQueryClient();

  // Filter & Search states
  const [search, setSearchVal] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('false');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(RULES_PAGE_SIZE);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);
  const [matchesRule, setMatchesRule] = useState<CategoryRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<CategoryRule | null>(null);

  // Form States
  const [merchantKey, setMerchantKey] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('MERCHANT_KEY');
  const [displayName, setDisplayName] = useState('');
  const [mcc, setMcc] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  // Debounce, then reset to page 0 — both inside the timeout callback (an
  // async/event context, not the effect's own synchronous body), so this
  // never trips react-hooks/set-state-in-effect.
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const isVerifiedParam: boolean | undefined =
    activeTab === 'true' ? true : activeTab === 'all' ? undefined : false;

  const listParams = {
    verified: isVerifiedParam,
    search: debouncedSearch || undefined,
    page,
    size,
  };

  const rulesQuery = useQuery({
    queryKey: keys.rules.list(listParams),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/rules', {
        params: { query: { ...listParams, sort: [] } },
      });
      return data as PagedRules;
    },
    placeholderData: keepPreviousData,
  });

  const { data: categories = [] } = useCategories();

  const rules = rulesQuery.data ?? EMPTY_RULES_PAGE;

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => api.POST('/api/v1/categories', { body: { name } }).then((r) => r.data!),
    onSuccess: (category) => {
      setSelectedCategories((prev) => [...prev, category]);
      toast.success('Category created!');
      queryClient.invalidateQueries({ queryKey: keys.categories.all });
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to create category')),
  });

  const createRuleMutation = useMutation({
    mutationFn: (body: Schemas['CreateRuleRequest']) =>
      api.POST('/api/v1/rules', { body }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Rule created successfully!');
      closeDialogs();
      queryClient.invalidateQueries({ queryKey: keys.rules.all });
    },
    onError: (error) => {
      const message = errorMessage(error, 'An unexpected error occurred.');
      const isConflict =
        error instanceof ApiError &&
        (error.response.code === 'CONFLICT' ||
          message.toLowerCase().includes('already exists') ||
          message.toLowerCase().includes('duplicate'));
      toast.error(isConflict ? 'Merchant rule already exists for this key.' : message);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Schemas['UpdateRuleRequest'] }) =>
      api.PUT('/api/v1/rules/{id}', { params: { path: { id } }, body }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Rule updated successfully!');
      closeDialogs();
      queryClient.invalidateQueries({ queryKey: keys.rules.all });
    },
    onError: (error) => toast.error(errorMessage(error, 'An unexpected error occurred.')),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/rules/{id}', { params: { path: { id } } }),
    onSuccess: () => {
      toast.success('Rule deleted successfully');
      setDeletingRule(null);
      queryClient.invalidateQueries({ queryKey: keys.rules.all });
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to delete rule.')),
  });

  const verifyRuleMutation = useMutation({
    mutationFn: (id: string) => api.POST('/api/v1/rules/{id}/verify', { params: { path: { id } } }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Rule verified — matching transactions cleared from review');
      queryClient.invalidateQueries({ queryKey: keys.rules.all });
    },
    onError: (error) => toast.error(errorMessage(error, 'Failed to verify rule.')),
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    setPage(0);
  };

  const handleCreateCategory = (name: string) => {
    createCategoryMutation.mutate(name);
  };

  const openCreateDialog = () => {
    setMerchantKey('');
    setMatchType('MERCHANT_KEY');
    setDisplayName('');
    setMcc('');
    setSelectedCategories([]);
    setIsCreateOpen(true);
  };

  const openEditDialog = (rule: CategoryRule) => {
    setEditingRule(rule);
    setMerchantKey(rule.merchantKey);
    setMatchType(rule.matchType || 'MERCHANT_KEY');
    setDisplayName(rule.displayName || '');
    setMcc(rule.mcc || '');
    setSelectedCategories(rule.categories);
  };

  function closeDialogs() {
    setIsCreateOpen(false);
    setEditingRule(null);
  }

  const handleSubmitRule = (e: FormEvent) => {
    e.preventDefault();

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

    const categoryIds = selectedCategories.map((c) => c.id);

    if (editingRule) {
      updateRuleMutation.mutate({
        id: editingRule.id,
        body: {
          merchantKey: merchantKey.trim(),
          matchType,
          displayName: displayName.trim() || undefined,
          categoryIds,
          mcc: mcc.trim() === '' ? '' : mcc.trim(),
        },
      });
    } else {
      createRuleMutation.mutate({
        merchantKey: merchantKey.trim(),
        matchType,
        displayName: displayName.trim() || undefined,
        categoryIds,
        mcc: mcc.trim() || undefined,
      });
    }
  };

  const handleDeleteRule = () => {
    if (!deletingRule) return;
    deleteRuleMutation.mutate(deletingRule.id);
  };

  const handleVerifyRule = (id: string) => {
    verifyRuleMutation.mutate(id);
  };

  return {
    isFetching: rulesQuery.isFetching,
    rules,
    searchVal: search,
    setSearchVal,
    activeTab,
    isCreateOpen,
    editingRule,
    matchesRule,
    setMatchesRule,
    deletingRule,
    setDeletingRule,
    isDeleting: deleteRuleMutation.isPending,
    merchantKey,
    setMerchantKey,
    matchType,
    setMatchType,
    displayName,
    setDisplayName,
    mcc,
    setMcc,
    selectedCategories,
    setSelectedCategories,
    creatingCategory: createCategoryMutation.isPending,
    formSubmitting: createRuleMutation.isPending || updateRuleMutation.isPending,
    categories,
    handleTabChange,
    handlePageChange,
    handleSizeChange,
    handleCreateCategory,
    openCreateDialog,
    openEditDialog,
    closeDialogs,
    handleSubmitRule,
    handleDeleteRule,
    handleVerifyRule,
  };
}

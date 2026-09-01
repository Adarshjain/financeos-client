'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { createCategory } from '@/actions/categories';
import {
  createRule,
  deleteRule,
  updateRule,
  verifyRule,
} from '@/actions/rules';
import { isValidMcc } from '@/components/forms/MccInput';
import { Category } from '@/lib/categories.types';
import { CategoryRule, MatchType } from '@/lib/rules.types';

import { validatePattern } from './RuleFormDialog';

interface UseRulesBrowserProps {
  categories: Category[];
  initialVerified: string;
  initialSearch: string;
}

export function useRulesBrowser({
  categories,
  initialVerified,
  initialSearch,
}: UseRulesBrowserProps) {
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
  const [localCategories, setLocalCategories] =
    useState<Category[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    setSearchVal(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setActiveTab(initialVerified);
  }, [initialVerified]);

  const updateQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
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
    },
    [searchParams, pathname, router]
  );

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

  const closeDialogs = () => {
    setIsCreateOpen(false);
    setEditingRule(null);
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
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

  const handleVerifyRule = async (id: string) => {
    try {
      const res = await verifyRule(id);
      if (res.success) {
        toast.success(
          'Rule verified — matching transactions cleared from review'
        );
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('Failed to verify rule.');
    }
  };

  return {
    isPending,
    searchVal,
    setSearchVal,
    activeTab,
    isCreateOpen,
    editingRule,
    matchesRule,
    setMatchesRule,
    deletingRule,
    setDeletingRule,
    isDeleting,
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
    creatingCategory,
    formSubmitting,
    localCategories,
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

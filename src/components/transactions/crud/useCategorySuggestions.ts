'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { Category } from '@/lib/categories.types';
import { keys } from '@/lib/query/keys';

interface UseCategorySuggestionsProps {
  categories: Category[];
  initialSelectedCategories: Category[];
  isUpdateMode: boolean;
  /** Called with an LLM-suggested MCC on first description blur; the caller
   * decides whether to accept it (e.g. only when its own mcc field is empty). */
  onMccSuggested: (mcc: string) => void;
}

/** Category selection + create-new-category, and the create-mode-only
 * "suggest categories/MCC from description" side effect on blur. */
export function useCategorySuggestions({
  categories,
  initialSelectedCategories,
  isUpdateMode,
  onMccSuggested,
}: UseCategorySuggestionsProps) {
  const queryClient = useQueryClient();

  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    initialSelectedCategories
  );
  const [localCategories, setLocalCategories] = useState<Category[]>(
    categories ?? []
  );
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [suggestingCategories, setSuggestingCategories] = useState(false);
  const suggestedDescriptionRef = useRef<string | null>(null);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.POST('/api/v1/categories', { body: { name } });
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.categories.all });
    },
  });

  const createCategory = async (categoryName: string) => {
    setCreatingCategory(true);
    try {
      const trimmed = categoryName.trim();
      if (!trimmed) {
        toast.error('Failed to create category: Category name is required');
        return;
      }
      const newCategory = await createCategoryMutation.mutateAsync(trimmed);
      setLocalCategories((prev) => [...prev, newCategory]);
      setSelectedCategories((prev) => [...prev, newCategory]);
    } catch (err) {
      toast.error(
        'Failed to create category: ' + (err instanceof ApiError ? err.response.message : 'Unknown error')
      );
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDescriptionBlur = async (
    e: React.FocusEvent<HTMLTextAreaElement>
  ) => {
    if (isUpdateMode) return;
    const description = e.target.value.trim();
    if (
      description.length < 3 ||
      suggestedDescriptionRef.current === description
    ) {
      return;
    }
    suggestedDescriptionRef.current = description;
    setSuggestingCategories(true);
    try {
      const { data } = await api.POST('/api/v1/categorize', { body: { description } });
      if (data && data.categories.length > 0) {
        const suggested = data.categories.map(
          (c) => categories.find((existing) => existing.id === c.id) ?? c
        );
        setSelectedCategories((prev) => (prev.length === 0 ? suggested : prev));
      }
      if (data?.mcc) {
        onMccSuggested(data.mcc);
      }
    } catch {
      // Silent suggestion
    } finally {
      setSuggestingCategories(false);
    }
  };

  return {
    localCategories,
    selectedCategories,
    setSelectedCategories,
    creatingCategory,
    suggestingCategories,
    createCategory,
    handleDescriptionBlur,
  };
}

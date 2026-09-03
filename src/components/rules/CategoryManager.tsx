'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, FolderTree, MoreVertical, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api/client';
import type { Category } from '@/lib/categories.types';
import { useCategories } from '@/lib/query/hooks/useCategories';
import { keys } from '@/lib/query/keys';

export function CategoryManager() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [renameCategoryName, setRenameCategoryName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()),
  );

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => api.POST('/api/v1/categories', { body: { name } }).then((r) => r.data!),
    onSuccess: (category) => {
      toast.success(`Category "${category.name}" created!`);
      setNewCategoryName('');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: keys.categories.all });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.response.message : 'Failed to create category');
    },
  });

  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.PUT('/api/v1/categories/{id}', {
        params: { path: { id } },
        body: { name },
      }).then((r) => r.data!),
    onSuccess: (category) => {
      toast.success(`Category renamed to "${category.name}"`);
      setEditingCategory(null);
      setRenameCategoryName('');
      queryClient.invalidateQueries({ queryKey: keys.categories.all });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.response.message : 'Failed to rename category');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (cat: { id: string; name: string }) =>
      api.DELETE('/api/v1/categories/{id}', {
        params: { path: { id: cat.id } },
      }),
    onSuccess: (_data, cat) => {
      toast.success(`Category "${cat.name}" deleted`);
      setDeletingCategory(null);
      queryClient.invalidateQueries({ queryKey: keys.categories.all });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.response.message : 'Failed to delete category');
    },
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate(newCategoryName.trim());
  };

  const handleRename = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const trimmed = renameCategoryName.trim();
    if (!trimmed || trimmed === editingCategory.name) return;
    renameCategoryMutation.mutate({ id: editingCategory.id, name: trimmed });
  };

  return (
    <div className="p-4 sm:p-6 pb-24 space-y-2 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Category Manager ({categories.length})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, view, and organize expense and income taxonomy categories
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="pl-9 bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 text-xs h-10"
        />
      </div>

      {/* Categories Grid */}
      {filteredCategories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories found"
          description={search ? 'Try adjusting your search query.' : 'Get started by creating your first category.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                    {cat.name}
                  </h4>
                  <p className="text-2xs text-slate-400 truncate">ID: {cat.id}</p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Category actions"
                  >
                    <MoreVertical className="h-4 w-4 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingCategory(cat);
                      setRenameCategoryName(cat.name);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5 mr-2" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeletingCategory(cat)}
                    className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600 dark:text-rose-400" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Create Category Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="create-category-form" onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Subscriptions"
                  disabled={createCategoryMutation.isPending}
                  autoFocus
                />
              </div>
            </form>
          </DialogBody>
          <DialogFooter
            primaryAction={{
              label: createCategoryMutation.isPending ? 'Creating...' : 'Create Category',
              type: 'submit',
              form: 'create-category-form',
              disabled: createCategoryMutation.isPending || !newCategoryName.trim(),
            }}
            secondaryAction={{
              label: 'Cancel',
              onClick: () => setIsCreateOpen(false),
              disabled: createCategoryMutation.isPending,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Rename Category Modal */}
      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => {
          if (!open && !renameCategoryMutation.isPending) {
            setEditingCategory(null);
            setRenameCategoryName('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="rename-category-form" onSubmit={handleRename} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rename-category-name">Category name</Label>
                <Input
                  id="rename-category-name"
                  value={renameCategoryName}
                  onChange={(e) => setRenameCategoryName(e.target.value)}
                  placeholder="e.g., Subscriptions"
                  disabled={renameCategoryMutation.isPending}
                  autoFocus
                />
              </div>
            </form>
          </DialogBody>
          <DialogFooter
            primaryAction={{
              label: renameCategoryMutation.isPending ? 'Saving...' : 'Save',
              type: 'submit',
              form: 'rename-category-form',
              disabled:
                renameCategoryMutation.isPending ||
                !renameCategoryName.trim() ||
                renameCategoryName.trim() === editingCategory?.name,
            }}
            secondaryAction={{
              label: 'Cancel',
              onClick: () => {
                setEditingCategory(null);
                setRenameCategoryName('');
              },
              disabled: renameCategoryMutation.isPending,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Category Modal */}
      <Dialog
        open={!!deletingCategory}
        onOpenChange={(open) => {
          if (!open && !deleteCategoryMutation.isPending) {
            setDeletingCategory(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Transactions in this category will keep their other categories; none are deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter
            primaryAction={{
              label: deleteCategoryMutation.isPending ? 'Deleting...' : 'Delete',
              variant: 'destructive',
              onClick: () => {
                if (deletingCategory) {
                  deleteCategoryMutation.mutate({
                    id: deletingCategory.id,
                    name: deletingCategory.name,
                  });
                }
              },
              disabled: deleteCategoryMutation.isPending,
            }}
            secondaryAction={{
              label: 'Cancel',
              onClick: () => setDeletingCategory(null),
              disabled: deleteCategoryMutation.isPending,
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

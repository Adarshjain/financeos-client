'use client';

import { FolderTree, Plus, Search, Tag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createCategory } from '@/actions/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category } from '@/lib/categories.types';

interface CategoryManagerProps {
  initialCategories: Category[];
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await createCategory(newCategoryName.trim());
      if (res.success) {
        setCategories((prev) => [...prev, res.data]);
        toast.success(`Category "${res.data.name}" created!`);
        setNewCategoryName('');
        setIsCreateOpen(false);
      } else {
        toast.error(res.error.message);
      }
    } catch {
      toast.error('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
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
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
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
        <Card className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center bg-white dark:bg-slate-900/40">
          <CardContent className="space-y-3 pt-2">
            <Tag className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No categories found
            </p>
            <p className="text-xs text-slate-400">
              {search ? 'Try adjusting your search query.' : 'Get started by creating your first category.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                  {cat.name}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">ID: {cat.id}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Category Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Create New Category
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category Name
                </Label>
                <Input
                  id="catName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Dining & Restaurants, Subscriptions..."
                  className="bg-slate-50 dark:bg-slate-950 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newCategoryName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                {isSubmitting ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

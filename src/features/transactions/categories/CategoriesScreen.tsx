'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  EmptyState,
  FilterBar,
  Icon,
  ListRow,
  Menu,
  MenuItem,
  Pager,
  type TabItem,
  Tabs,
  Text,
} from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import { useSearchText } from '@/features/shell/useSearchText';
import type { Category } from '@/lib/categories.types';
import type { Transaction } from '@/lib/transaction.types';

import { CategoryDialog } from '../category/CategoryDialog';
import { TRANSACTION_TABS } from '../list/TransactionsView';
import { CATEGORIES_PAGE_SIZE, type CategoriesPage, categoriesUrl, type CategoriesUrlState, type UncategorizedData } from './categoriesModel';
import { CategoryNameDialog } from './CategoryNameDialog';
import { UncategorizedCard } from './UncategorizedCard';
import { useCategoryMutations } from './useCategoryMutations';

export interface CategoriesScreenProps {
  /** The page of categories matching the search; null when they could not be loaded. */
  categories: CategoriesPage | null;
  reference?: string;
  state: CategoriesUrlState;
  /** Left out when no transaction lacks a category (or it could not be loaded). */
  uncategorized?: UncategorizedData;
}

type Dialogs =
  | { kind: 'create' }
  | { kind: 'actions'; category: Category }
  | { kind: 'rename'; category: Category }
  | { kind: 'delete'; category: Category }
  | null;

/** /transactions/categories: the Categories tab. Add from the top bar's +, rename and delete from a row. */
export function CategoriesScreen({ categories, reference, state, uncategorized }: CategoriesScreenProps) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<Dialogs>(null);
  const [tagging, setTagging] = React.useState<Transaction | null>(null);
  const close = () => setDialog(null);
  const { create, rename, remove } = useCategoryMutations({ onCreated: close, onRenamed: close, onDeleted: close });
  const { text, setText } = useSearchText(state.q, (q) => router.replace(categoriesUrl({ q, page: 0 }), { scroll: false }));

  const tabs: TabItem[] = TRANSACTION_TABS.map((t) => ({
    value: t.value,
    label: t.label,
    asChild: true,
    children: <Link href={appHref(t.href)} prefetch={false} />,
  }));

  const pager = (borderPosition: 'top' | 'bottom') =>
    categories ? (
      <Pager
        page={state.page}
        size={CATEGORIES_PAGE_SIZE}
        totalElements={categories.totalElements}
        totalPages={categories.totalPages}
        unit="categories"
        borderPosition={borderPosition}
        onPageChange={(page) => router.push(categoriesUrl({ q: state.q, page }), { scroll: false })}
      />
    ) : null;

  return (
    <ShellPage crumb="Money" title="Categories" flushTop onAdd={() => setDialog({ kind: 'create' })}>
      <div className="flex min-w-0 flex-col gap-space-8 desk:gap-space-16">
        <Tabs items={tabs} value="categories" />
        {uncategorized ? (
          <UncategorizedCard
            count={uncategorized.count}
            rows={uncategorized.rows}
            reviewHref={uncategorized.reviewHref}
            onTag={(id) => setTagging(uncategorized.transactions.find((t) => t.id === id) ?? null)}
          />
        ) : null}
        {categories === null ? (
          <ErrorState
            title="Could not load categories"
            description="The categories request failed. Try again, and quote the reference if it keeps failing."
            action={{ label: 'Try again', onSelect: () => router.refresh() }}
            reference={reference}
          />
        ) : (
          <>
            <FilterBar
              search={{ value: text, onValueChange: setText }}
            />
            {categories.rows.length === 0 ? (
              <EmptyState
                title="No categories found"
                description={state.q ? 'Try adjusting your search query.' : 'Get started by creating your first category.'}
              />
            ) : (
              <Card>
                {pager('bottom')}
                {categories.rows.map((category) => (
                  <ListRow
                    key={category.id}
                    title={category.name}
                    // A click or tap opens the actions; the desktop row also has its ⋯ menu.
                    onClick={() => setDialog({ kind: 'actions', category })}
                    trailing={
                      // The menu (it renders in a portal) must not also open the row's dialog.
                      <div
                        className="max-desk:hidden"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Menu
                          align="end"
                          trigger={
                            <Button variant="ghost" iconOnly aria-label={`Actions for ${category.name}`}>
                              <Icon name="more" size="md" />
                            </Button>
                          }
                        >
                          <MenuItem onSelect={() => setDialog({ kind: 'rename', category })}>Rename</MenuItem>
                          <MenuItem destructive onSelect={() => setDialog({ kind: 'delete', category })}>
                            Delete
                          </MenuItem>
                        </Menu>
                      </div>
                    }
                  />
                ))}
                {pager('top')}
              </Card>
            )}
          </>
        )}
      </div>

      {dialog?.kind === 'create' ? (
        <CategoryNameDialog saving={create.isPending} onSubmit={(name) => create.mutate(name)} onClose={close} />
      ) : null}
      {dialog?.kind === 'rename' ? (
        <CategoryNameDialog
          key={dialog.category.id}
          category={dialog.category}
          saving={rename.isPending}
          onSubmit={(name) => rename.mutate({ id: dialog.category.id, name })}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === 'actions' ? (
        <Dialog open onOpenChange={(open) => (open ? undefined : close())}>
          <DialogContent
            size="sm"
            title={dialog.category.name}
            tertiary={{ label: 'Cancel', onSelect: close }}
            secondary={{ label: 'Rename', onSelect: () => setDialog({ kind: 'rename', category: dialog.category }) }}
            primary={{
              label: 'Delete',
              destructive: true,
              onSelect: () => setDialog({ kind: 'delete', category: dialog.category }),
            }}
          >
            <DialogBody>
              <Text variant="body" tone="ink-3">
                Rename this category or delete it.
              </Text>
            </DialogBody>
          </DialogContent>
        </Dialog>
      ) : null}
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) close();
        }}
        title={dialog?.kind === 'delete' ? `Delete ${dialog.category.name}?` : 'Delete category?'}
        description="Transactions in this category will keep their other categories; none are deleted."
        confirmLabel="Delete"
        confirmLoading={remove.isPending}
        onConfirm={() => {
          if (dialog?.kind === 'delete') remove.mutate(dialog.category);
        }}
      />
      {tagging ? <CategoryDialog key={tagging.id} transaction={tagging} onClose={() => setTagging(null)} /> : null}
    </ShellPage>
  );
}

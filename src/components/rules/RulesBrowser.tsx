'use client';

import { Plus } from 'lucide-react';

import { JobsPanel } from '@/components/jobs/JobsPanel';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { RuleMatchesDialog } from '@/components/rules/RuleMatchesDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { DeleteRuleDialog } from './browser/DeleteRuleDialog';
import { RuleCard } from './browser/RuleCard';
import { RuleFormDialog } from './browser/RuleFormDialog';
import { RulesFilterBar } from './browser/RulesFilterBar';
import { useRulesBrowser } from './browser/useRulesBrowser';

export function RulesBrowser() {
  const {
    isFetching,
    rules,
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
  } = useRulesBrowser();

  const filterBar = (
    <RulesFilterBar
      activeTab={activeTab}
      onTabChange={handleTabChange}
      searchVal={searchVal}
      setSearchVal={setSearchVal}
      pageNumber={rules.number}
      pageSize={rules.size}
      totalElements={rules.totalElements}
      totalPages={rules.totalPages}
      isPending={isFetching}
      onPageChange={handlePageChange}
      onSizeChange={handleSizeChange}
    />
  );

  return (
    <div className="space-y-2 p-4 pb-32">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Categorization Rules
          </h1>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4" />
          <span>New Rule</span>
        </Button>
      </div>

      {/* Rules list content */}
      {rules.content.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-6">
          <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
            No categorization rules found
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Transactions you ingest will generate rules automatically — or click
            &quot;New Rule&quot; to create one manually.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rules.content.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onMatches={setMatchesRule}
              onVerify={handleVerifyRule}
              onEdit={openEditDialog}
              onDelete={setDeletingRule}
            />
          ))}
        </div>
      )}

      <JobsPanel types={['RULE_APPLY']} title="Recent rule application jobs" />

      {/* Desktop filter/search/pagination bar */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {filterBar}
      </Card>

      {/* Mobile PageActionBar Integration */}
      <PageActionBar>{filterBar}</PageActionBar>

      <RuleFormDialog
        open={isCreateOpen || !!editingRule}
        editingRule={editingRule}
        onClose={closeDialogs}
        matchType={matchType}
        setMatchType={setMatchType}
        merchantKey={merchantKey}
        setMerchantKey={setMerchantKey}
        displayName={displayName}
        setDisplayName={setDisplayName}
        mcc={mcc}
        setMcc={setMcc}
        categories={categories}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        onCreateCategory={handleCreateCategory}
        creatingCategory={creatingCategory}
        formSubmitting={formSubmitting}
        onSubmit={handleSubmitRule}
      />

      <DeleteRuleDialog
        deletingRule={deletingRule}
        onClose={() => setDeletingRule(null)}
        isDeleting={isDeleting}
        onDelete={handleDeleteRule}
      />

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

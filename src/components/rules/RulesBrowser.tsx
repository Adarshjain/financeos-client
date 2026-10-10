'use client';

import { Plus } from 'lucide-react';

import { JobsPanel } from '@/components/jobs/JobsPanel';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { PagedSection } from '@/components/reports/views/PagedSection';
import { RuleMatchesDialog } from '@/components/rules/RuleMatchesDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { DeleteRuleDialog } from './browser/DeleteRuleDialog';
import { RuleCard } from './browser/RuleCard';
import { RuleFormDialog } from './browser/RuleFormDialog';
import { RulesFilterBar } from './browser/RulesFilterBar';
import { RulesSelectionBar } from './browser/RulesSelectionBar';
import { useRulesBrowser } from './browser/useRulesBrowser';

export function RulesBrowser() {
  const {
    isFetching,
    rules,
    searchVal,
    setSearchVal,
    activeTab,
    filters,
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
    handleFilterChange,
    handleClearFilters,
    handlePageChange,
    handleSizeChange,
    handleCreateCategory,
    openCreateDialog,
    openEditDialog,
    closeDialogs,
    handleSubmitRule,
    handleDeleteRule,
    handleVerifyRule,
    selectedIds,
    pageSelectableIds,
    isBulkVerifying,
    handleToggleSelect,
    handleSelectPage,
    handleBulkVerify,
  } = useRulesBrowser();

  const filterBar = (
    <RulesFilterBar
      activeTab={activeTab}
      onTabChange={handleTabChange}
      filters={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      categories={categories}
      searchVal={searchVal}
      setSearchVal={setSearchVal}
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

      {/* Desktop filter/search bar */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {filterBar}
      </Card>

      <RulesSelectionBar
        pageSelectableIds={pageSelectableIds}
        selectedIds={selectedIds}
        approving={isBulkVerifying}
        onSelectPage={handleSelectPage}
        onApprove={handleBulkVerify}
      />

      {/* Rules list content, paged above and below */}
      <PagedSection
        className="space-y-2"
        topClassName="px-1"
        bottomClassName="px-1"
        page={{
          number: rules.number,
          size: rules.size,
          totalElements: rules.totalElements,
          totalPages: rules.totalPages,
        }}
        loading={isFetching}
        onPageChange={handlePageChange}
        onSizeChange={handleSizeChange}
        unit="rule"
      >
        {rules.content.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-6">
            <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">
              No categorization rules found
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Transactions you ingest will generate rules automatically — or
              click &quot;New Rule&quot; to create one manually.
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
                selected={selectedIds.includes(rule.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        )}
      </PagedSection>

      <JobsPanel types={['RULE_APPLY']} title="Recent rule application jobs" />

      {/* Mobile PageActionBar Integration */}
      <PageActionBar defaultCollapsed trigger={<span>Filters</span>}>
        {filterBar}
      </PageActionBar>

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

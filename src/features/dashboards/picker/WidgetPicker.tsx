'use client';

// "Add widget": built-in widgets (from the server's catalog) or saved reports as selectable cards, a search, the
// chosen built-in's params, and an optional title in place of its own. Built-ins may be added more than once.
// One the user can't use yet is greyed with the server's reason. Mounted only while open.

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { ChoiceCard, Dialog, DialogBody, DialogContent, EmptyState, Icon, Skeleton, Tabs, TextField } from '@/components/ds';
import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';
import { useBuiltins } from '@/lib/query/hooks/useBuiltins';
import { keys } from '@/lib/query/keys';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { ParamFields } from '../params/ParamFields';
import { useBuiltinParamsForm } from '../params/useBuiltinParamsForm';
import { builtinMeta, filterBuiltins, filterReports, reportDescription, reportMeta } from './pickerModel';

type Tab = 'builtin' | 'reports';

/** Stands in for the form while no built-in is chosen. */
const NO_BUILTIN: BuiltinWidgetResponse = { key: '', label: '', description: '', category: '', kind: 'template', minW: 0, params: [] };

export interface WidgetPickerProps {
  reports: readonly ReportSummaryResponse[];
  onAddBuiltin: (def: BuiltinWidgetResponse, params: WidgetParams, title: string | null) => void;
  onAddReport: (report: ReportSummaryResponse, title: string | null) => void;
  onClose: () => void;
}

export function WidgetPicker({ reports, onAddBuiltin, onAddReport, onClose }: WidgetPickerProps) {
  const queryClient = useQueryClient();
  const { data: builtins = [], isLoading } = useBuiltins();
  const [tab, setTab] = React.useState<Tab>('builtin');
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState('');
  const [title, setTitle] = React.useState('');

  // Availability is per user and changes with their data (a first card, a first loan): check again on open.
  React.useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: keys.dashboards.builtins() });
  }, [queryClient]);

  const def = tab === 'builtin' ? (builtins.find((b) => b.key === selected) ?? null) : null;
  const report = tab === 'reports' ? (reports.find((r) => r.id === selected) ?? null) : null;
  const form = useBuiltinParamsForm(def ?? NO_BUILTIN);

  const shownBuiltins = filterBuiltins(builtins, 'all', query);
  const shownReports = filterReports(reports, 'all', query);
  const choose = (value: string) => {
    setSelected(value);
    setTitle('');
  };
  const changeTab = (next: string) => {
    setTab(next as Tab);
    setSelected('');
    setTitle('');
  };

  const add = () => {
    if (def) onAddBuiltin(def, form.params(), title.trim() || null);
    else if (report) onAddReport(report, title.trim() || null);
    onClose();
  };
  const canAdd = def ? form.valid : report != null;
  const label = def?.label ?? report?.name;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="lg"
        title="Add widget"
        description="Built-ins update themselves; report widgets show a saved report"
        secondary={{ label: 'Cancel', onSelect: onClose }}
        primary={{ label: 'Add to board', onSelect: add, disabled: !canAdd }}
      >
        <DialogBody>
          <Tabs
            value={tab}
            onValueChange={changeTab}
            items={[
              { value: 'builtin', label: 'Built-in', count: builtins.length },
              { value: 'reports', label: 'My reports', count: reports.length },
            ]}
          />
          <TextField
            type="search"
            size="md"
            prefix={<Icon name="search" size="sm" />}
            clearable
            placeholder="Search widgets"
            value={query}
            onValueChange={setQuery}
          />
          {tab === 'builtin' ? (
            isLoading ? (
              <Skeleton height={96} />
            ) : builtins.length === 0 ? (
              <EmptyState compact description="No built-in widgets available." />
            ) : shownBuiltins.length === 0 ? (
              <EmptyState compact description="No widgets match." />
            ) : (
              <ChoiceCard.Group value={selected} onValueChange={choose} className="grid grid-cols-1 desk:grid-cols-3 gap-space-8">
                {shownBuiltins.map((b) => (
                  <ChoiceCard
                    key={b.key}
                    value={b.key}
                    title={b.label}
                    description={b.description}
                    meta={b.unavailableReason ?? builtinMeta(b, b.key === selected)}
                    disabled={Boolean(b.unavailableReason)}
                  />
                ))}
              </ChoiceCard.Group>
            )
          ) : reports.length === 0 ? (
            <EmptyState compact description="No saved reports yet. Make one in Reports." />
          ) : shownReports.length === 0 ? (
            <EmptyState compact description="No reports match." />
          ) : (
            <ChoiceCard.Group value={selected} onValueChange={choose} className="grid grid-cols-1 desk:grid-cols-3 gap-space-8">
              {shownReports.map((r) => (
                <ChoiceCard key={r.id} value={r.id} title={r.name} description={reportDescription(r)} meta={reportMeta(r.id === selected)} />
              ))}
            </ChoiceCard.Group>
          )}
          {def ? <ParamFields form={form} /> : null}
          {def || report ? <TextField label="Title override" optional placeholder={label} value={title} onValueChange={setTitle} /> : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

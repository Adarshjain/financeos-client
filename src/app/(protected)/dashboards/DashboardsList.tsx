'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { api, ApiError } from '@/lib/api/client';
import type { DashboardWidget } from '@/lib/dashboards.types';
import { useDashboards } from '@/lib/query/hooks/useDashboards';
import { keys } from '@/lib/query/keys';
import { cn, formatDate } from '@/lib/utils';

export function DashboardsList() {
  const qc = useQueryClient();
  const { data: dashboards = [] } = useDashboards();
  // The dashboard whose default state is mid-flight (disables its toggle).
  const [defaultPendingId, setDefaultPendingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/dashboards/{id}', { params: { path: { id } } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dashboards.all });
      toast.success('Dashboard deleted');
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.response.message : 'Failed to delete dashboard'),
  });

  // Re-reads the dashboard before updating so the mutation can refuse rather
  // than clobber a dashboard that changed since this list was rendered — it
  // passes along the `updatedAt` this list was rendered with as the guard.
  const setDefaultMutation = useMutation({
    mutationFn: async ({
      id,
      makeDefault,
      updatedAt,
    }: {
      id: string;
      makeDefault: boolean;
      updatedAt: string;
    }) => {
      const { data: current } = await api.GET('/api/v1/dashboards/{id}', {
        params: { path: { id } },
      });
      if (!current) throw new Error('Dashboard not found');
      if (current.updatedAt !== updatedAt) {
        throw new Error(
          'This dashboard changed since the page was loaded. Reload and try again — setting the default would otherwise discard those changes.',
        );
      }
      const widgets: DashboardWidget[] = current.widgets.map((w) => ({
        id: w.id,
        reportId: w.reportId,
        title: w.title ?? '',
        layout: w.layout,
      }));
      return api.PUT('/api/v1/dashboards/{id}', {
        params: { path: { id } },
        body: {
          name: current.name,
          description: current.description ?? undefined,
          isDefault: makeDefault,
          widgets,
        },
      });
    },
    onMutate: ({ id }) => setDefaultPendingId(id),
    onSettled: () => setDefaultPendingId(null),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: keys.dashboards.all });
      toast.success(vars.makeDefault ? 'Set as default' : 'Default cleared');
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiError
          ? e.response.message
          : e instanceof Error
            ? e.message
            : 'Failed to update default dashboard',
      ),
  });

  // Awaited (rather than fire-and-forget) so the ConfirmationDialog stays open
  // and busy for the duration of the request, closing only once it settles —
  // matching its `primaryAction` contract. Errors are swallowed here since
  // `onError` above already surfaces the toast; the dialog closes either way,
  // same as it did before this migration.
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // onError already surfaced a toast.
    }
  };

  // Passes the updatedAt this list was rendered with, so the mutation can
  // refuse rather than clobber a dashboard that changed in the meantime.
  const handleToggleDefault = (id: string, makeDefault: boolean, updatedAt: string) =>
    setDefaultMutation.mutate({ id, makeDefault, updatedAt });

  if (dashboards.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="No dashboards yet"
        description="Create a dashboard and add your saved reports as widgets."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {dashboards.map((d) => {
        const pending = defaultPendingId === d.id;
        return (
          <Card key={d.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-2">
              <Link
                href={`/dashboards/${d.id}`}
                className="flex flex-1 items-center gap-2 font-semibold text-slate-900 hover:underline dark:text-white"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400" />
                {d.name}
              </Link>
              {d.isDefault && <Badge variant="success">Default</Badge>}
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={pending}
                title={d.isDefault ? 'Clear default' : 'Set as default'}
                aria-pressed={d.isDefault}
                onClick={() => handleToggleDefault(d.id, !d.isDefault, d.updatedAt)}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Star
                    className={cn(
                      'h-4 w-4',
                      d.isDefault
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-400',
                    )}
                  />
                )}
              </Button>
            </div>
            {d.description && (
              <p className="line-clamp-2 text-sm text-slate-500">
                {d.description}
              </p>
            )}
            <p className="text-xs text-slate-500">
              {d.widgets.length} widget{d.widgets.length === 1 ? '' : 's'} · Updated{' '}
              {formatDate(d.updatedAt)}
            </p>
            <div className="mt-auto flex gap-2">
              <Link href={`/dashboards/${d.id}`} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                  <Pencil className="h-4 w-4" />
                  Open
                </Button>
              </Link>
              <ConfirmationDialog
                title="Delete dashboard"
                description={
                  <div>
                    Delete <strong>{d.name}</strong>? This cannot be undone.
                  </div>
                }
                primaryActionText="Delete"
                primaryAction={() => handleDelete(d.id)}
                trigger={
                  <Button variant="destructive-outline" size="sm" className="flex-1">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                }
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

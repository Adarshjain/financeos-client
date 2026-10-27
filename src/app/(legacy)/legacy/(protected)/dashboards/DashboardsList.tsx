'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { legacyHref } from '@/features/shell/routes';
import { api } from '@/lib/api/client';
import { useDashboards, useSetDefaultDashboard } from '@/lib/query/hooks/useDashboards';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import { cn, formatDate } from '@/lib/utils';

export function DashboardsList() {
  const qc = useQueryClient();
  const { data: dashboards = [] } = useDashboards();

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/dashboards/{id}', { params: { path: { id } } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dashboards.all });
      toast.success('Dashboard deleted');
    },
    onError: (e) =>
      toastError(e, 'Failed to delete dashboard'),
  });

  // Re-reads the dashboard first and refuses rather than clobber one that changed since this list rendered.
  const setDefaultMutation = useSetDefaultDashboard();

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
        // The dashboard whose default state is mid-flight (disables its toggle).
        const pending = setDefaultMutation.isPending && setDefaultMutation.variables?.id === d.id;
        return (
          // The title link stretches over the whole card, so a click anywhere opens the dashboard;
          // the star, Edit and Delete sit above it (relative z-10) and keep their own actions.
          <Card key={d.id} className="relative flex flex-col gap-3 p-4">
            <div className="flex items-start gap-2">
              <Link
                href={legacyHref(`/dashboards/${d.id}`)}
                className="flex flex-1 items-center gap-2 font-semibold text-slate-900 after:absolute after:inset-0 after:rounded-[inherit] hover:underline dark:text-white"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400" />
                {d.name}
              </Link>
              {d.isDefault && <Badge variant="success">Default</Badge>}
              <Button
                variant="ghost"
                size="icon-xs"
                className="relative z-10"
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
            <div className="relative z-10 mt-auto flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" asChild>
                <Link href={legacyHref(`/dashboards/${d.id}?edit=1`)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
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

'use client';

import { LayoutDashboard, Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteDashboard, setDefaultDashboard } from '@/actions/dashboards';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { cn, formatDate } from '@/lib/utils';

interface DashboardsListProps {
  dashboards: DashboardResponse[];
}

export function DashboardsList({ dashboards }: DashboardsListProps) {
  const router = useRouter();
  // The dashboard whose default state is mid-flight (disables its toggle).
  const [defaultPendingId, setDefaultPendingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const res = await deleteDashboard(id);
    if (res.success) {
      toast.success('Dashboard deleted');
      router.refresh();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleToggleDefault = async (id: string, makeDefault: boolean) => {
    setDefaultPendingId(id);
    const res = await setDefaultDashboard(id, makeDefault);
    setDefaultPendingId(null);
    if (res.success) {
      toast.success(makeDefault ? 'Set as default' : 'Default cleared');
      router.refresh();
    } else {
      toast.error(res.error.message);
    }
  };

  if (dashboards.length === 0) {
    return (
      <Card>
        <div className="py-12 text-center">
          <p className="mb-2 text-slate-600 dark:text-slate-400">
            No dashboards yet
          </p>
          <p className="text-sm text-slate-500">
            Create a dashboard and add your saved reports as widgets.
          </p>
        </div>
      </Card>
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
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={pending}
                title={d.isDefault ? 'Clear default' : 'Set as default'}
                aria-pressed={d.isDefault}
                onClick={() => handleToggleDefault(d.id, !d.isDefault)}
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
                  <Button variant="secondary" size="sm" className="flex-1">
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

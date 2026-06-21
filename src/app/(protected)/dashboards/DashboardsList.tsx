'use client';

import { LayoutDashboard, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteDashboard } from '@/actions/dashboards';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { DashboardSummaryResponse } from '@/lib/dashboards.types';
import { formatDate } from '@/lib/utils';

interface DashboardsListProps {
  dashboards: DashboardSummaryResponse[];
}

export function DashboardsList({ dashboards }: DashboardsListProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    const res = await deleteDashboard(id);
    if (res.success) {
      toast.success('Dashboard deleted');
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
      {dashboards.map((d) => (
        <Card key={d.id} className="flex flex-col gap-3 p-4">
          <Link
            href={`/dashboards/${d.id}`}
            className="flex items-center gap-2 font-semibold text-slate-900 hover:underline dark:text-white"
          >
            <LayoutDashboard className="h-4 w-4 text-slate-400" />
            {d.name}
          </Link>
          {d.description && (
            <p className="line-clamp-2 text-sm text-slate-500">
              {d.description}
            </p>
          )}
          <p className="text-xs text-slate-500">
            {d.widgetCount} widget{d.widgetCount === 1 ? '' : 's'} · Updated{' '}
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
      ))}
    </div>
  );
}

'use client';

// Re-creates the seeded "Home" dashboard (built-in widgets) and makes it the
// default. Used by the landing page's empty state and the dashboards list.

import { Loader2, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button, type ButtonProps } from '@/components/ui/button';
import { useRestoreHomeDashboard } from '@/lib/query/hooks/useDashboards';
import { toastError } from '@/lib/toastError';

interface RestoreHomeButtonProps {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}

export function RestoreHomeButton({ variant = 'secondary', size, className }: RestoreHomeButtonProps) {
  const router = useRouter();
  const restore = useRestoreHomeDashboard();

  const handleClick = async () => {
    try {
      await restore.mutateAsync();
      toast.success('Home dashboard restored');
      // Server-rendered pages (the landing route) read the dashboard list on the server.
      router.refresh();
    } catch (e) {
      toastError(e, 'Failed to restore the Home dashboard');
    }
  };

  return (
    <Button variant={variant} size={size} className={className} disabled={restore.isPending} onClick={handleClick}>
      {restore.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      Restore default Home
    </Button>
  );
}

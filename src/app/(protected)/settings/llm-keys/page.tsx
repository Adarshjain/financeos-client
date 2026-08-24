import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth';

import { listLlmKeys } from './actions';
import { LlmKeysManager } from './LlmKeysManager';

export default async function LlmKeysSettingsPage() {
  await requireAuth();
  const keysRes = await listLlmKeys();
  const initialKeys = keysRes.success ? keysRes.data : [];

  return (
    <div className="space-y-4 p-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button asChild size="icon-sm" variant="ghost">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI API Keys</h1>
      </div>

      <LlmKeysManager initialKeys={initialKeys} />
    </div>
  );
}

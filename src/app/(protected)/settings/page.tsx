import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth';

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Settings</h1>
      </div>

      <div className="space-x-4 flex items-center p-2">
        {user.pictureUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.pictureUrl}
            alt={user.displayName || 'Profile'}
            className="h-16 w-16 rounded-full overflow-hidden border object-cover"
          />
        )}
        <div className="flex flex-col">
          {user.displayName && (
            <p className="font-bold mt-1">{user.displayName}</p>
          )}
          <p className="font-medium mt-1">{user.email}</p>
        </div>
      </div>


      <Card className="rounded-md">
        <CardContent>
          <Link href="/settings/gmail">
            <div className="flex justify-between items-center text-slate-900 dark:text-white px-4 py-2">
              Gmail Integration
              <ArrowRight className="w-5 h-5" />
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

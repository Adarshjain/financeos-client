import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {requireAuth} from '@/lib/auth';
import {GmailConnect} from './gmail-connect';

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardContent>
          <div className="space-x-4 flex items-center">
            {user.pictureUrl && (
              <img
                src={user.pictureUrl}
                alt={user.displayName || 'Profile'}
                className="h-16 w-16 rounded-full overflow-hidden border object-cover"
              />
            )}
            <div className="flex flex-col">
              {user.displayName && (
                <p className="font-medium mt-1">{user.displayName}</p>
              )}
              <p className="font-medium mt-1">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gmail Integration</CardTitle>
          <CardDescription>Connect Gmail to auto-import transaction emails</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your Gmail account to automatically import financial notifications and transaction emails.
          </p>
          <GmailConnect/>
        </CardContent>
      </Card>
    </div>
  );
}

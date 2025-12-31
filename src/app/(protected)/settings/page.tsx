import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { requireAuth } from '@/lib/auth';
import { GmailConnect } from './gmail-connect';

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border">
              <label className="text-sm text-muted-foreground">Email Address</label>
              <p className="font-medium mt-1">{user.email}</p>
            </div>
            <div className="p-4 rounded-lg border">
              <label className="text-sm text-muted-foreground">Member Since</label>
              <p className="font-medium mt-1">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
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
          <GmailConnect />
        </CardContent>
      </Card>
    </div>
  );
}

import AccountsClientPage from '@/components/accounts/AccountsClientPage';
import { accountsApi } from '@/lib/apiClient';

export default async function AccountsPage() {
  const accounts = await accountsApi.list();
  return <AccountsClientPage accounts={accounts} />;
}

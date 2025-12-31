import Link from 'next/link';
import { notFound } from 'next/navigation';
import { accountsApi } from '@/lib/api-client';
import { formatMoney, formatDateTime, getAccountTypeLabel, getPositionLabel } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccountDetailsForm } from './account-details-form';

interface AccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: AccountPageProps) {
  const { id } = await params;
  
  let account;
  try {
    account = await accountsApi.getById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/accounts"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Accounts
      </Link>

      {/* Account Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{account.name}</h2>
              {account.description && (
                <p className="text-slate-600 dark:text-slate-400 mt-1">{account.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="info">{getAccountTypeLabel(account.type)}</Badge>
                <Badge variant={account.financialPosition === 'liability' ? 'danger' : 'success'}>
                  {getPositionLabel(account.financialPosition)}
                </Badge>
                {account.excludeFromNetAsset && (
                  <Badge variant="warning">Excluded from Net Asset</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Account ID</p>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">{account.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-sm text-slate-500">Created</p>
              <p className="text-slate-900 dark:text-slate-200 mt-1">{formatDateTime(account.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Last Updated</p>
              <p className="text-slate-900 dark:text-slate-200 mt-1">{formatDateTime(account.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Details */}
      {(account.bankDetails || account.creditCardDetails || account.stockDetails || account.mutualFundDetails) && (
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            {account.bankDetails && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Opening Balance</p>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-200 mt-1">
                    {formatMoney(account.bankDetails.openingBalance)}
                  </p>
                </div>
                {account.bankDetails.last4 && (
                  <div>
                    <p className="text-sm text-slate-500">Account Last 4</p>
                    <p className="text-lg font-mono text-slate-900 dark:text-slate-200 mt-1">
                      ****{account.bankDetails.last4}
                    </p>
                  </div>
                )}
              </div>
            )}

            {account.creditCardDetails && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Credit Limit</p>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-200 mt-1">
                    {formatMoney(account.creditCardDetails.creditLimit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Card Last 4</p>
                  <p className="text-lg font-mono text-slate-900 dark:text-slate-200 mt-1">
                    ****{account.creditCardDetails.last4}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Payment Due Day</p>
                  <p className="text-lg text-slate-900 dark:text-slate-200 mt-1">
                    {account.creditCardDetails.paymentDueDay}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Grace Period</p>
                  <p className="text-lg text-slate-900 dark:text-slate-200 mt-1">
                    {account.creditCardDetails.gracePeriodDays} days
                  </p>
                </div>
              </div>
            )}

            {account.stockDetails && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Instrument Code</p>
                  <p className="text-lg font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {account.stockDetails.instrumentCode}
                  </p>
                </div>
                {account.stockDetails.lastTradedPrice && (
                  <div>
                    <p className="text-sm text-slate-500">Last Traded Price</p>
                    <p className="text-lg font-medium text-slate-900 dark:text-slate-200 mt-1">
                      {formatMoney(account.stockDetails.lastTradedPrice)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {account.mutualFundDetails && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Fund Code</p>
                  <p className="text-lg font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {account.mutualFundDetails.instrumentCode}
                  </p>
                </div>
                {account.mutualFundDetails.lastTradedPrice && (
                  <div>
                    <p className="text-sm text-slate-500">NAV</p>
                    <p className="text-lg font-medium text-slate-900 dark:text-slate-200 mt-1">
                      {formatMoney(account.mutualFundDetails.lastTradedPrice)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Update Details Form */}
      <AccountDetailsForm account={account} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/transactions">
              <Button variant="secondary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Transaction
              </Button>
            </Link>
            {(account.type === 'stock' || account.type === 'mutual_fund') && (
              <Link href="/investments">
                <Button variant="secondary">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Trade Investment
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

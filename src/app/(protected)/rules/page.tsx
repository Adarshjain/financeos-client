import { RulesBrowser } from '@/components/rules/RulesBrowser';
import { categoriesApi,rulesApi } from '@/lib/apiClient';

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; search?: string; page?: string; size?: string }>;
}) {
  const { verified, search, page, size } = await searchParams;

  const pageNum = page ? parseInt(page, 10) : 0;
  const pageSize = size ? parseInt(size, 10) : 50;

  // Defaults to false (Unverified) if not specified or is 'false'.
  // If 'all', verified param is omitted to fetch both verified and unverified.
  // If 'true', verified param is true.
  let isVerifiedParam: boolean | undefined = false;
  if (verified === 'true') {
    isVerifiedParam = true;
  } else if (verified === 'all') {
    isVerifiedParam = undefined;
  } else if (verified === 'false') {
    isVerifiedParam = false;
  } else {
    // Default to unverified rules
    isVerifiedParam = false;
  }

  const [rulesPaged, categories] = await Promise.all([
    rulesApi.list({
      verified: isVerifiedParam,
      search: search || undefined,
      page: pageNum,
      size: pageSize,
    }),
    categoriesApi.list(),
  ]);

  return (
    <RulesBrowser
      initialRules={rulesPaged}
      categories={categories}
      initialVerified={verified || 'false'}
      initialSearch={search || ''}
    />
  );
}

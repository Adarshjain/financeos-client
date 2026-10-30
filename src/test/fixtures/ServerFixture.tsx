import { Badge } from '@/components/ds/Badge/Badge';
import { Banner } from '@/components/ds/Banner/Banner';
import { Card } from '@/components/ds/Card/Card';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';

export function ServerFixture({
  header = 'Server Test',
  badge = 'Server Badge',
  banner = 'Server Banner',
}: {
  header?: string;
  badge?: string;
  banner?: string;
} = {}) {
  return (
    <Card>
      <SectionHeader>{header}</SectionHeader>
      <Badge tone="neutral">{badge}</Badge>
      <Banner tone="neutral">{banner}</Banner>
    </Card>
  );
}

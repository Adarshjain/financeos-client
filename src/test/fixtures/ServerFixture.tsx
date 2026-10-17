import { Badge, Banner, Card, SectionHeader } from '@/components/ds';

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

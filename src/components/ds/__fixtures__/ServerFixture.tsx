import { Badge, Card, SectionHeader, Banner } from '@/components/ds';

export function ServerFixture() {
  return (
    <Card>
      <SectionHeader label="Server Test" />
      <Badge tone="grey">Server Badge</Badge>
      <Banner tone="neutral">Server Banner</Banner>
    </Card>
  );
}

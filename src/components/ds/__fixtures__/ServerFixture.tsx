import { Badge, Banner,Card, SectionHeader } from '@/components/ds';

export function ServerFixture() {
  return (
    <Card>
      <SectionHeader label="Server Test" />
      <Badge tone="grey">Server Badge</Badge>
      <Banner tone="neutral">Server Banner</Banner>
    </Card>
  );
}

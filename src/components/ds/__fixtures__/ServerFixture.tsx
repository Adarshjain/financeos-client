import { Badge, Banner,Card, SectionHeader } from '@/components/ds';

export function ServerFixture() {
  return (
    <Card>
      <SectionHeader>Server Test</SectionHeader>
      <Badge tone="neutral">Server Badge</Badge>
      <Banner tone="neutral">Server Banner</Banner>
    </Card>
  );
}

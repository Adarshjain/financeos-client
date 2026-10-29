import React from 'react';

import { Card, Figures, SectionHeader } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

const POSITION = [
  { label: 'Quantity', value: '120' },
  { label: 'Avg cost', value: '₹1,204.50' },
  { label: 'LTP', value: '₹1,310.25', caption: 'Yahoo · 3:30 pm' },
  { label: 'Realised P&L', value: '+₹4,200', tone: 'positive' as const, caption: 'booked on sells' },
  { label: 'Total charges', value: '₹312.40', caption: 'across 6 trades' },
];

/** /ds/figures: the Figures component in its forms, at whatever width the window is. */
export function DsFiguresScreen() {
  return (
    <ShellPage title="Figures" crumb="New design">
      <div className="max-w-container-md mx-auto flex flex-col gap-space-16 desk:gap-space-24">
        <Card>
          <SectionHeader borderTop={false}>Three across</SectionHeader>
          <div className="p-space-16">
            <Figures figures={POSITION} />
          </div>
        </Card>
        <Card>
          <SectionHeader borderTop={false}>Four across</SectionHeader>
          <div className="p-space-16">
            <Figures columns={4} figures={POSITION.slice(0, 4)} />
          </div>
        </Card>
        <Card>
          <SectionHeader borderTop={false}>Tones</SectionHeader>
          <div className="p-space-16">
            <Figures
              figures={[
                { label: 'Gain', value: '+₹2,40,000', tone: 'positive', caption: '+24%' },
                { label: 'Loss', value: '−₹1,200', tone: 'danger', caption: '−2%' },
                { label: 'Neutral', value: '₹10,00,000' },
              ]}
            />
          </div>
        </Card>
        <Card>
          <SectionHeader borderTop={false}>Loading</SectionHeader>
          <div className="p-space-16">
            <Figures.Skeleton count={5} />
          </div>
        </Card>
      </div>
    </ShellPage>
  );
}

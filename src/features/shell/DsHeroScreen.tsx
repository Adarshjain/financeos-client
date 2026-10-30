import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Hero } from '@/components/ds/Hero/Hero';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { ShellPage } from '@/features/shell/ShellPage';

/** /ds/hero: the Hero component in its forms, at whatever width the window is. */
export function DsHeroScreen() {
  return (
    <ShellPage title="Hero" crumb="New design">
      <div className="max-w-container-md mx-auto flex flex-col gap-space-16 desk:gap-space-24">
        <Card>
          <SectionHeader borderTop={false}>Value, change, two figures</SectionHeader>
          <div className="p-space-16">
            <Hero
              value="₹12,40,000"
              change={{ text: '+₹1,240 today', tone: 'positive' }}
              figures={[
                { label: 'Invested', value: '₹10,00,000' },
                { label: 'Unrealised P&L', value: '+₹2,40,000', tone: 'positive', caption: '+24%' },
              ]}
            />
          </div>
        </Card>
        <Card>
          <SectionHeader borderTop={false}>Label, three figures</SectionHeader>
          <div className="p-space-16">
            <Hero
              label="Net worth"
              value="₹48,20,000"
              figures={[
                { label: 'Cash & wallets', value: '₹3,10,000' },
                { label: 'Cards you owe', value: '₹42,000', tone: 'danger' },
                { label: 'Investments', value: '₹45,00,000' },
              ]}
            />
          </div>
        </Card>
        <Card>
          <SectionHeader borderTop={false}>With a progress bar</SectionHeader>
          <div className="p-space-16">
            <Hero
              label="Outstanding"
              value="₹8,40,000"
              figures={[
                { label: 'EMI', value: '₹21,000' },
                { label: 'Rate', value: '9.5%' },
                { label: 'Months left', value: '48' },
              ]}
            >
              <ProgressBar value={40} max={100} />
            </Hero>
          </div>
        </Card>
        <Card>
          <SectionHeader borderTop={false}>Loading</SectionHeader>
          <div className="p-space-16">
            <Hero.Skeleton label change figures={3} />
          </div>
        </Card>
      </div>
    </ShellPage>
  );
}

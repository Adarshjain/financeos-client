import React from 'react';

import { Card } from '@/components/ds/Card/Card';

/** Card header whose title and subtitle wrap onto new lines instead of being cut (the Card's own header truncates). */
export function SmsCardHeader({ title, subtitle, action }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card.Header>
      <div className="min-w-0">
        <Card.Title truncate={false}>{title}</Card.Title>
        {subtitle ? <Card.Subtitle truncate={false}>{subtitle}</Card.Subtitle> : null}
      </div>
      {action ? <div className="shrink-0 flex items-center">{action}</div> : null}
    </Card.Header>
  );
}

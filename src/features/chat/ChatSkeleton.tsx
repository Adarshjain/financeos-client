import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { areaCrumb } from '@/features/shell/navigation';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';

/** What a chat page shows while it loads: the pane (desktop) beside the thread's first answer. */
export function ChatSkeleton({ conversation }: { conversation?: boolean }) {
  return (
    <ShellPage crumb={areaCrumb('chat')} title="Ask the data" addHref={appHref('/chat')} addLabel="New chat" backHref={conversation ? appHref('/chat') : appHref('/reports')}>
      <div className="flex flex-col desk:flex-row desk:items-start gap-space-8 desk:gap-space-24">
        <div className={conversation ? 'max-desk:hidden desk:w-72 desk:shrink-0' : 'order-2 desk:order-1 desk:w-72 desk:shrink-0'}>
          <Card>
            <div className="p-space-16 flex flex-col gap-space-8 desk:gap-space-12">
              <Skeleton width="50%" height={16} />
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} height={32} />
              ))}
            </div>
          </Card>
        </div>
        <div className="order-1 desk:order-2 flex flex-1 min-w-0 flex-col items-center">
          <div className="flex w-full desk:max-w-container-md flex-col gap-space-8 desk:gap-space-16">
            {conversation ? (
              <>
                <Skeleton width="50%" height={36} className="self-end" />
                <Skeleton height={20} />
                <Skeleton height={20} width="80%" />
                <Skeleton height={160} />
              </>
            ) : (
              <>
                <Skeleton width="60%" height={32} className="desk:self-center" />
                <div className="grid grid-cols-1 desk:grid-cols-3 gap-space-8 desk:gap-space-12">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} height={72} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ShellPage>
  );
}

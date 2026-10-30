import React from 'react';

import { ActionBar } from '@/components/ds/ActionBar/ActionBar';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Menu } from '@/components/ds/Menu/Menu';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { ShellPage } from '@/features/shell/ShellPage';

/** /ds/action-bar: the ActionBar component in its forms, at whatever width the window is. */
export function DsActionBarScreen() {
  const menu = (
    <>
      <Menu.Item onSelect={() => {}}>Edit</Menu.Item>
      <Menu.Item onSelect={() => {}}>Delete</Menu.Item>
    </>
  );
  return (
    <ShellPage title="ActionBar" crumb="New design">
      <div className="max-w-container-md mx-auto flex flex-col gap-space-16 desk:gap-space-24">
        <Card>
          <SectionHeader borderTop={false}>Info, action, menu</SectionHeader>
          <div className="p-space-16">
            <ActionBar info="Stock · NSE" actions={<Button variant="primary">Record trade</Button>} menu={menu} />
          </div>
        </Card>
        <Card>
          <SectionHeader borderTop={false}>Actions only</SectionHeader>
          <div className="p-space-16">
            <ActionBar actions={<Button variant="primary">Edit</Button>} />
          </div>
        </Card>
        <Card>
          <SectionHeader borderTop={false}>Info only</SectionHeader>
          <div className="p-space-16">
            <ActionBar info="Closed" />
          </div>
        </Card>
        <Card>
          <SectionHeader borderTop={false}>Long info truncates</SectionHeader>
          <div className="p-space-16">
            <ActionBar
              info="A very long note about this person that goes on and on and will not fit on a phone-width row at all"
              actions={<Button variant="primary">Settle up</Button>}
              menu={menu}
            />
          </div>
        </Card>
      </div>
    </ShellPage>
  );
}

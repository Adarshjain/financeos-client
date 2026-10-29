'use client';

import React from 'react';

/** What an action's `href` renders: a link element taking `href`, `onClick` and children. */
export type LinkComponent = React.ComponentType<
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: React.ReactNode }
>;

const LinkContext = React.createContext<LinkComponent | 'a'>('a');

/**
 * Hands Dinero the app's link component (the router's `Link`), so an action with an `href` navigates
 * without a reload. Without a provider a plain `<a>` renders. Root mounts it from its `linkComponent` prop.
 */
export function LinkProvider({ component, children }: { component?: LinkComponent; children: React.ReactNode }) {
  return <LinkContext.Provider value={component ?? 'a'}>{children}</LinkContext.Provider>;
}

export function useLinkComponent(): LinkComponent | 'a' {
  return React.useContext(LinkContext);
}

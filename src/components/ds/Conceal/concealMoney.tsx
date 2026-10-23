import React from 'react';

import { Conceal } from './Conceal';

/**
 * For components that draw text from a prop: a string holding a ₹ amount goes through Conceal,
 * as do the strings inside a fragment or an array; any other node is returned as is.
 * No hooks, so server components can call it.
 */
export function concealMoney(node: React.ReactNode): React.ReactNode {
  if (typeof node === 'string') return node.includes('₹') ? <Conceal>{node}</Conceal> : node;
  if (Array.isArray(node)) return node.map((child, i) => <React.Fragment key={i}>{concealMoney(child)}</React.Fragment>);
  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.type === React.Fragment) {
    return <>{concealMoney(node.props.children)}</>;
  }
  return node;
}

import React from 'react';

/**
 * Resolves the async Server Components inside a React element tree so a test can render the
 * result in jsdom (React does not render async components on the client).
 */
export async function resolveAsyncElements(node: React.ReactNode): Promise<React.ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveAsyncElements));
  if (!React.isValidElement(node)) return node;
  const element = node as React.ReactElement<{ children?: React.ReactNode }>;
  const { type, props } = element;
  if (typeof type === 'function' && type.constructor.name === 'AsyncFunction') {
    return resolveAsyncElements(await (type as (p: unknown) => Promise<React.ReactNode>)(props));
  }
  if (props.children === undefined) return element;
  const children = await resolveAsyncElements(props.children);
  return React.cloneElement(element, undefined, ...(Array.isArray(children) ? children : [children]));
}

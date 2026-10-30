import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Text } from '@/components/ds/Text/Text';

const components: Components = {
  p: ({ children }) => <Text as="p">{children}</Text>,
  strong: ({ children }) => (
    <Text as="strong" variant="body-strong">
      {children}
    </Text>
  ),
  em: ({ children }) => <Text as="em">{children}</Text>,
  code: ({ children }) => (
    <Text as="code" mono>
      {children}
    </Text>
  ),
  ul: ({ children }) => (
    <Text as="ul" className="list-disc pl-space-20 space-y-space-4">
      {children}
    </Text>
  ),
  ol: ({ children }) => (
    <Text as="ol" className="list-decimal pl-space-20 space-y-space-4">
      {children}
    </Text>
  ),
  li: ({ children }) => <Text as="li">{children}</Text>,
  h1: ({ children }) => (
    <Text as="p" variant="body-strong">
      {children}
    </Text>
  ),
  h2: ({ children }) => (
    <Text as="p" variant="body-strong">
      {children}
    </Text>
  ),
  h3: ({ children }) => (
    <Text as="p" variant="body-strong">
      {children}
    </Text>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <Text as="th" variant="label" className="text-left pr-space-12">
      {children}
    </Text>
  ),
  td: ({ children }) => (
    <Text as="td" className="pr-space-12 py-space-4">
      {children}
    </Text>
  ),
};

/** An answer's prose. Markdown elements are drawn by Text; nothing is styled by hand. */
export function ChatMarkdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-space-8 min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

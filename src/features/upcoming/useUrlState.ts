import React from 'react';

/**
 * Page state that lives in the URL: starts from it, changes at once for the user, and follows the
 * URL again whenever it changes from outside (a tab link that clears the query string).
 */
export function useUrlState<T>(search: string, parse: (search: string) => T) {
  const [value, setValue] = React.useState(() => parse(search));
  const [seen, setSeen] = React.useState(search);
  if (search !== seen) {
    setSeen(search);
    setValue(parse(search));
  }
  return [value, setValue] as const;
}

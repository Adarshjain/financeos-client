// Loader of the link-suggestions dialog, shared so it is cached once (see useLazyDialog).
export const loadLinkSuggestionsDialog = () => import('./LinkSuggestionsDialog').then((m) => m.LinkSuggestionsDialog);

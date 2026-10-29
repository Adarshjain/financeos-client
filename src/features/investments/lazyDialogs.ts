// Loaders of the investments dialogs, shared so a dialog loaded from one screen is cached for every other (see useLazyDialog).
export const loadRecordTradeDialog = () => import('./tradebook/TradeDialog').then((m) => m.RecordTradeDialog);
export const loadEditTradeDialog = () => import('./tradebook/TradeDialog').then((m) => m.EditTradeDialog);
export const loadDividendAddDialog = () => import('./dividends/DividendFormDialog').then((m) => m.DividendAddDialog);
export const loadCorporateActionDialog = () => import('./corporate-actions/CorporateActionDialog').then((m) => m.CorporateActionDialog);
export const loadInstrumentAddDialog = () => import('./instruments/InstrumentAddDialog').then((m) => m.InstrumentAddDialog);
export const loadInstrumentEditDialog = () => import('./instruments/InstrumentEditDialog').then((m) => m.InstrumentEditDialog);
export const loadResetInstrumentDialog = () => import('./instruments/ResetInstrumentDialog').then((m) => m.ResetInstrumentDialog);
export const loadFnoAddDialog = () => import('./fno/FnoAddDialog').then((m) => m.FnoAddDialog);
export const loadFnoTradeDialog = () => import('./fno/FnoTradeDialog').then((m) => m.FnoTradeDialog);
export const loadEpfAddDialog = () => import('./epf/EpfAddDialog').then((m) => m.EpfAddDialog);

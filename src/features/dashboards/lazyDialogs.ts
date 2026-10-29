// Loaders of the dashboards dialogs, shared so a dialog loaded from one screen is cached for the others (see useLazyDialog).
export const loadWidgetPicker = () => import('./picker/WidgetPicker').then((m) => m.WidgetPicker);
export const loadWidgetSettings = () => import('./frame/WidgetSettingsDialog').then((m) => m.WidgetSettingsDialog);

// Shape of a built-in group module: the registry entry fields a group adds per key
// (its icon comes from registry.tsx), and its template views keyed by `view` name.

import type { ComponentType } from 'react';

import type { BuiltinRegistryEntry, TemplateViewProps } from './registry';

export type GroupEntries = Readonly<Record<string, Partial<Omit<BuiltinRegistryEntry, 'icon'>>>>;
export type GroupViews = Readonly<Record<string, ComponentType<TemplateViewProps>>>;

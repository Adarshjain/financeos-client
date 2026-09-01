import {
  ArrowLeftRight,
  Ban,
  Calendar,
  CheckSquare,
  Eye,
  FolderOpen,
  Hash,
  HelpCircle,
  Landmark,
  List,
  Mail,
  ToggleLeft,
  Type,
  Wallet,
} from 'lucide-react';
import React from 'react';

import type { FieldType } from '@/lib/reports.types';

export const FIELD_ICONS: Record<string, React.ReactNode> = {
  amount: (
    <Hash className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
  ),
  tradeValue: (
    <Hash className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
  ),
  cashflow: (
    <Hash className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
  ),
  realizedPnl: (
    <Hash className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
  ),
  totalCharges: (
    <Hash className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
  ),
  tds: <Hash className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />,
  date: <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />,
  tradeDate: (
    <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
  ),
  payDate: (
    <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
  ),
  exDate: (
    <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
  ),
  entryDate: (
    <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
  ),
  exitDate: (
    <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
  ),
  expiryDate: (
    <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
  ),
  type: (
    <ArrowLeftRight className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
  ),
  source: <Mail className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />,
  accountId: (
    <Wallet className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
  ),
  accountType: (
    <Landmark className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
  ),
  account: (
    <Wallet className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
  ),
  broker: <Landmark className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />,
  instrument: (
    <FolderOpen className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
  ),
  category: (
    <FolderOpen className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" />
  ),
  reviewType: (
    <CheckSquare className="h-3.5 w-3.5 text-pink-500 dark:text-pink-400" />
  ),
  description: (
    <Type className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
  ),
  isUnderMonitoring: (
    <Eye className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
  ),
  isExcluded: (
    <Ban className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
  ),
};

export const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  number: <Hash className="h-3.5 w-3.5 text-slate-400" />,
  date: <Calendar className="h-3.5 w-3.5 text-slate-400" />,
  string: <Type className="h-3.5 w-3.5 text-slate-400" />,
  enum: <List className="h-3.5 w-3.5 text-slate-400" />,
  boolean: <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />,
};

export function getFieldIcon(fieldName: string, type?: FieldType) {
  return (
    FIELD_ICONS[fieldName] ??
    (type ? FIELD_TYPE_ICONS[type] : undefined) ?? (
      <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
    )
  );
}

import type { Broker } from '@/lib/account.types';
import { amountExpressionValue } from '@/lib/amountExpression';
import { formatMoney } from '@/lib/format';
import type { CreateFnoTradeRequest, FnoContractType, FnoTradeResponse, OptionType } from '@/lib/types';


export interface FnoTradeForm {
  brokerAccountId: string;
  contractType: FnoContractType;
  tradingSymbol: string;
  underlying: string;
  optionType: OptionType | '';
  strike: string;
  expiry: string;
  entryDate: string;
  exitDate: string;
  quantity: string;
  buyValue: string;
  sellValue: string;
  totalCharges: string;
}

export type FnoTradeErrors = Partial<Record<keyof FnoTradeForm, string>>;

const text = (value: number | null | undefined): string => (value == null ? '' : String(value));

/** The form of a trade being recorded; the broker defaults to the first one and the entry date to `today`. */
export function emptyForm(brokers: Pick<Broker, 'id'>[], today: string): FnoTradeForm {
  return {
    brokerAccountId: brokers[0]?.id ?? '',
    contractType: 'option',
    tradingSymbol: '',
    underlying: '',
    optionType: '',
    strike: '',
    expiry: '',
    entryDate: today,
    exitDate: '',
    quantity: '',
    buyValue: '',
    sellValue: '',
    totalCharges: '',
  };
}

/** The form of a trade being edited. */
export function formFromTrade(trade: FnoTradeResponse): FnoTradeForm {
  return {
    brokerAccountId: trade.brokerAccountId,
    contractType: trade.contractType,
    tradingSymbol: trade.tradingSymbol,
    underlying: trade.underlyingSymbol ?? '',
    optionType: trade.optionType ?? '',
    strike: text(trade.strikePrice),
    expiry: trade.expiryDate ?? '',
    entryDate: trade.entryDate ?? '',
    exitDate: trade.exitDate ?? '',
    quantity: text(trade.quantity),
    buyValue: text(trade.buyValue),
    sellValue: text(trade.sellValue),
    totalCharges: text(trade.totalCharges),
  };
}

/** A non-negative number from an amount field's text (arithmetic allowed); null when empty or invalid. */
function amount(value: string): number | null {
  const n = amountExpressionValue(value);
  return n !== null && n >= 0 ? n : null;
}

/** What is wrong with the form, by field; empty when it can be saved. */
export function validateForm(form: FnoTradeForm): FnoTradeErrors {
  const errors: FnoTradeErrors = {};
  if (!form.brokerAccountId) errors.brokerAccountId = 'Choose a broker account.';
  if (!form.tradingSymbol.trim()) errors.tradingSymbol = 'Enter the trading symbol.';
  const qty = Number(form.quantity);
  if (!form.quantity.trim() || !Number.isFinite(qty) || qty <= 0) errors.quantity = 'Enter a quantity above zero.';
  if (form.buyValue.trim() === '' || amount(form.buyValue) === null) errors.buyValue = 'Enter the buy value.';
  if (form.sellValue.trim() !== '' && amount(form.sellValue) === null) errors.sellValue = 'Enter a valid sell value.';
  if (form.totalCharges.trim() !== '' && amount(form.totalCharges) === null) errors.totalCharges = 'Enter valid charges.';
  if (!form.entryDate) errors.entryDate = 'Enter the entry date.';
  if (form.entryDate && form.exitDate && form.exitDate < form.entryDate) {
    errors.exitDate = 'The exit date cannot be before the entry date.';
  }
  if (form.entryDate && form.expiry && form.expiry < form.entryDate) {
    errors.expiry = 'The expiry cannot be before the entry date.';
  }
  if (form.contractType === 'option' && form.strike.trim() !== '' && amount(form.strike) === null) {
    errors.strike = 'Enter a valid strike.';
  }
  return errors;
}

/** The save request. Notes are not on the form: an edit sends the trade's own notes back so they are kept. */
export function toRequest(form: FnoTradeForm, notes?: string): CreateFnoTradeRequest {
  const isOption = form.contractType === 'option';
  const strike = isOption && form.strike.trim() !== '' ? amount(form.strike) : null;
  const charges = form.totalCharges.trim() !== '' ? amount(form.totalCharges) : null;
  return {
    brokerAccountId: form.brokerAccountId,
    tradingSymbol: form.tradingSymbol.trim().toUpperCase(),
    underlyingSymbol: form.underlying.trim().toUpperCase() || undefined,
    contractType: form.contractType,
    optionType: isOption && form.optionType ? form.optionType : undefined,
    strikePrice: strike ?? undefined,
    expiryDate: form.expiry || undefined,
    quantity: Number(form.quantity),
    buyValue: amount(form.buyValue) ?? 0,
    sellValue: form.sellValue.trim() !== '' ? (amount(form.sellValue) ?? 0) : 0,
    totalCharges: charges ?? undefined,
    entryDate: form.entryDate || undefined,
    exitDate: form.exitDate || undefined,
    notes: notes?.trim() || undefined,
  };
}

export interface NetModel {
  /** "Gross +₹5,625 · charges ₹96.40". */
  line: string;
  /** "Net +₹5,528.60". */
  net: string;
  tone: 'positive' | 'danger' | undefined;
}

/** "+₹5,625" / "−₹1,339.50": a signed rupee figure; `exact` keeps two decimals. */
function signed(value: number, exact = false): string {
  if (Math.round(value * 100) === 0) return '₹0';
  return formatMoney(value, { sign: 'always', decimals: exact ? 'exact' : 'auto' });
}

/** Gross, charges and net from the amounts typed so far; null until a buy or sell value is there. */
export function netModel(form: FnoTradeForm): NetModel | null {
  if (form.buyValue.trim() === '' && form.sellValue.trim() === '') return null;
  const buy = amount(form.buyValue) ?? 0;
  const sell = amount(form.sellValue) ?? 0;
  const charges = amount(form.totalCharges) ?? 0;
  const gross = sell - buy;
  const net = Math.round((gross - charges) * 100) / 100;
  return {
    line: `Gross ${signed(gross)} · charges ${formatMoney(charges, { decimals: 'exact' })}`,
    net: `Net ${signed(net, true)}`,
    tone: net > 0 ? 'positive' : net < 0 ? 'danger' : undefined,
  };
}

/** "Zerodha · ZQ4471": the broker's name with its client id. */
export function brokerLabel(broker: Pick<Broker, 'name' | 'clientId'>): string {
  return broker.clientId ? `${broker.name} · ${broker.clientId}` : broker.name;
}

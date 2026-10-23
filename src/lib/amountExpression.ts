/**
 * Amount-field arithmetic: type `120+45` and the field resolves to `165`.
 * Pure recursive-descent parser (no eval / Function). Supports numbers with
 * optional grouping commas and decimals, + - * / × ÷, unary minus/plus,
 * parentheses and standard precedence.
 */

import { sanitizeDecimalInput } from '@/lib/utils';

const OPERATOR_CHARS = /[+\-*/×÷()]/;

type Token = { t: 'num'; v: number } | { t: 'op'; v: string };

function tokenize(src: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ') {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9,]/.test(src[j])) j += 1;
      if (src[j] === '.') {
        j += 1;
        while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      }
      const raw = src.slice(i, j).replace(/,/g, '');
      if (!/^(\d+\.?\d*|\.\d+)$/.test(raw)) return null;
      tokens.push({ t: 'num', v: Number(raw) });
      i = j;
      continue;
    }
    if (OPERATOR_CHARS.test(ch)) {
      tokens.push({ t: 'op', v: ch === '×' ? '*' : ch === '÷' ? '/' : ch });
      i += 1;
      continue;
    }
    return null;
  }
  return tokens;
}

/** True when the text holds an arithmetic operator or parenthesis. */
export function hasAmountOperator(value: string): boolean {
  return OPERATOR_CHARS.test(value);
}

/**
 * Evaluates an arithmetic amount expression, rounded to 2 decimals.
 * Returns null for empty / invalid input or division by zero.
 */
export function evaluateAmountExpression(input: string): number | null {
  const tokens = tokenize(input.trim());
  if (!tokens || tokens.length === 0) return null;
  let pos = 0;
  let failed = false;

  const peek = () => tokens[pos];
  const isOp = (tok: Token | undefined, ...ops: string[]) =>
    tok !== undefined && tok.t === 'op' && ops.includes(tok.v);

  function primary(): number {
    const tok = peek();
    if (tok?.t === 'num') {
      pos += 1;
      return tok.v;
    }
    if (isOp(tok, '(')) {
      pos += 1;
      const v = expr();
      if (isOp(peek(), ')')) pos += 1;
      else failed = true;
      return v;
    }
    failed = true;
    return 0;
  }

  function unary(): number {
    if (isOp(peek(), '-')) {
      pos += 1;
      return -unary();
    }
    if (isOp(peek(), '+')) {
      pos += 1;
      return unary();
    }
    return primary();
  }

  function term(): number {
    let v = unary();
    while (!failed && isOp(peek(), '*', '/')) {
      const op = (peek() as { v: string }).v;
      pos += 1;
      const r = unary();
      if (op === '*') v *= r;
      else if (r === 0) failed = true;
      else v /= r;
    }
    return v;
  }

  function expr(): number {
    let v = term();
    while (!failed && isOp(peek(), '+', '-')) {
      const op = (peek() as { v: string }).v;
      pos += 1;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  const result = expr();
  if (failed || pos !== tokens.length || !Number.isFinite(result)) return null;
  return Math.round((result + Number.EPSILON) * 100) / 100;
}

/**
 * Resolves an amount field's text: when it holds an operator and evaluates to a
 * non-negative number, returns the result as plain text; otherwise returns the
 * text untouched so the form's own validation reports it. `allowNegative` is for
 * fields that may legitimately be below zero (an opening balance).
 */
export function resolveAmountExpression(value: string, options?: { allowNegative?: boolean }): string {
  if (!hasAmountOperator(value)) return value;
  const result = evaluateAmountExpression(value);
  if (result === null || (result < 0 && !options?.allowNegative)) return value;
  return String(result);
}

/**
 * The finite number an amount field's text stands for (evaluating any arithmetic), or null
 * when it is empty or invalid ("5+", "100/0", "1.2.3", a negative where none is allowed).
 * Submit with this, never with parseFloat or Number on the raw text.
 */
export function amountExpressionValue(value: string, options?: { allowNegative?: boolean }): number | null {
  if (!value.trim()) return null;
  const n = Number(resolveAmountExpression(value.trim(), options));
  return Number.isFinite(n) ? n : null;
}

/**
 * Typing filter for amount fields: digits, one decimal point per number and the
 * operators + - * / × ÷ ( ). Commas and spaces are dropped; a leading minus is
 * dropped so amounts stay positive.
 */
export function sanitizeAmountExpressionInput(value: string): string {
  const cleaned = value.replace(/[^0-9.+\-*/×÷()]/g, '').replace(/^-+/, '');
  return hasAmountOperator(cleaned) ? cleaned : sanitizeDecimalInput(cleaned);
}

/**
 * Props for a Dinero TextField amount: filters typing and resolves any
 * arithmetic on blur. Spread next to `value`; call `resolveAmountExpression`
 * on the value again before submitting (Enter submits without a blur).
 * `onEdit` runs after each keystroke (e.g. to clear a field error).
 */
export function amountExpressionProps(
  value: string,
  setValue: (next: string) => void,
  onEdit?: () => void,
) {
  return {
    onValueChange: (v: string) => {
      setValue(sanitizeAmountExpressionInput(v));
      onEdit?.();
    },
    onBlur: () => {
      const resolved = resolveAmountExpression(value);
      if (resolved !== value) setValue(resolved);
    },
  };
}

# AmountField

An amount TextField. On desktop it is a plain text input that also takes arithmetic (`120+80`, resolved on blur). On phone, tapping it never opens the OS keyboard: a sheet opens over the form with the big amount, the number keypad and Apply. Apply puts the resolved value in the field; dismissing the sheet leaves it as it was.

## Props
- Everything TextField takes (`label`, `prefix`, `helper`, `error`, `size`, `value`, `onValueChange`, `disabled`, `inputMode`…); pair it with `amountExpressionProps(value, setValue)` from `@/lib/amountExpression`.
- `onNegative?: () => void`: accepts a negative result. The field gets the amount without its sign and this is called (the transaction form switches to debit). Without it a negative result cannot be applied.

## Variants
Empty, filled, arithmetic expression, with error, disabled.

## Built from
TextField, Dialog, Keypad, Text, `evaluateAmountExpression`, `formatMoney`.

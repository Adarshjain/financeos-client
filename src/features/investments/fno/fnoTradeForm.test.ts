import { describe, expect, it } from 'vitest';

import { trades } from './fno.fixtures';
import { brokerLabel, emptyForm, formFromTrade, netModel, toRequest, validateForm } from './fnoTradeForm';

const valid = { ...emptyForm([{ id: 'b1' }], '2026-10-13'), tradingSymbol: 'nifty26oct25200ce', quantity: '75', buyValue: '11250', sellValue: '16875' };

describe('F&O trade form', () => {
  it('starts as an options trade on the first broker', () => {
    expect(emptyForm([{ id: 'b1' }, { id: 'b2' }], '2026-10-13')).toMatchObject({
      brokerAccountId: 'b1',
      contractType: 'option',
      tradingSymbol: '',
      entryDate: '2026-10-13',
    });
    expect(emptyForm([], '2026-10-13').brokerAccountId).toBe('');
  });

  it('fills the form from a trade', () => {
    expect(formFromTrade(trades[1])).toEqual({
      brokerAccountId: 'b1',
      contractType: 'option',
      tradingSymbol: 'NIFTY26OCT25200CE',
      underlying: 'NIFTY',
      optionType: 'CE',
      strike: '25200',
      expiry: '2026-10-22',
      entryDate: '2026-10-01',
      exitDate: '2026-10-04',
      quantity: '75',
      buyValue: '11250',
      sellValue: '16875',
      totalCharges: '96.4',
    });
  });

  it('needs a broker, a symbol, a quantity above zero and a buy value', () => {
    expect(validateForm({ ...emptyForm([], '2026-10-13'), entryDate: '' })).toEqual({
      brokerAccountId: 'Choose a broker account.',
      tradingSymbol: 'Enter the trading symbol.',
      quantity: 'Enter a quantity above zero.',
      buyValue: 'Enter the buy value.',
      entryDate: 'Enter the entry date.',
    });
    expect(validateForm(valid)).toEqual({});
    expect(validateForm({ ...valid, quantity: '0' }).quantity).toBeDefined();
  });

  it('needs an entry date, and an exit and expiry that are not before it', () => {
    expect(validateForm({ ...valid, entryDate: '' }).entryDate).toBe('Enter the entry date.');
    expect(validateForm({ ...valid, entryDate: '2026-10-13', exitDate: '2026-10-12' }).exitDate).toBe(
      'The exit date cannot be before the entry date.',
    );
    expect(validateForm({ ...valid, entryDate: '2026-10-13', expiry: '2026-10-01' }).expiry).toBe(
      'The expiry cannot be before the entry date.',
    );
    expect(validateForm({ ...valid, entryDate: '2026-10-13', exitDate: '2026-10-13', expiry: '2026-10-29' })).toEqual({});
  });

  it('refuses a sell value, charges or strike that are not numbers', () => {
    const errors = validateForm({ ...valid, sellValue: '5+', totalCharges: '1.2.3', strike: 'x' });
    expect(Object.keys(errors).sort()).toEqual(['sellValue', 'strike', 'totalCharges']);
  });

  it('accepts arithmetic in an amount and a blank sell value', () => {
    expect(validateForm({ ...valid, buyValue: '100*75', sellValue: '' })).toEqual({});
    expect(toRequest({ ...valid, buyValue: '100*75', sellValue: '' })).toMatchObject({ buyValue: 7500, sellValue: 0 });
  });

  it('builds the request: upper-case symbols, numbers, dates and the option fields', () => {
    expect(
      toRequest({
        ...valid,
        underlying: ' nifty ',
        optionType: 'CE',
        strike: '25200',
        expiry: '2026-10-22',
        entryDate: '2026-10-01',
        exitDate: '2026-10-04',
        totalCharges: '96.40',
      }),
    ).toEqual({
      brokerAccountId: 'b1',
      tradingSymbol: 'NIFTY26OCT25200CE',
      underlyingSymbol: 'NIFTY',
      contractType: 'option',
      optionType: 'CE',
      strikePrice: 25200,
      expiryDate: '2026-10-22',
      quantity: 75,
      buyValue: 11250,
      sellValue: 16875,
      totalCharges: 96.4,
      entryDate: '2026-10-01',
      exitDate: '2026-10-04',
      notes: undefined,
    });
  });

  it('leaves the option type and strike out of a future', () => {
    const body = toRequest({ ...valid, contractType: 'future', optionType: 'PE', strike: '100' });
    expect(body.contractType).toBe('future');
    expect(body.optionType).toBeUndefined();
    expect(body.strikePrice).toBeUndefined();
  });

  it('sends an edited trade\'s notes back so they are kept', () => {
    expect(toRequest(valid, 'Expiry week').notes).toBe('Expiry week');
  });

  it('works out gross, charges and net as the amounts are typed', () => {
    expect(netModel({ ...valid, totalCharges: '96.40' })).toEqual({
      line: 'Gross +₹5,625 · charges ₹96.40',
      net: 'Net +₹5,528.60',
      tone: 'positive',
    });
    expect(netModel({ ...valid, buyValue: '14500', sellValue: '13250', totalCharges: '88.9' })).toMatchObject({
      line: 'Gross −₹1,250 · charges ₹88.90',
      net: 'Net −₹1,338.90',
      tone: 'danger',
    });
  });

  it('shows no net line until a buy or sell value is typed', () => {
    expect(netModel({ ...valid, buyValue: '', sellValue: '' })).toBeNull();
  });

  it('labels a broker with its client id when it has one', () => {
    expect(brokerLabel({ name: 'Zerodha', clientId: 'ZQ4471' })).toBe('Zerodha · ZQ4471');
    expect(brokerLabel({ name: 'Groww', clientId: undefined })).toBe('Groww');
  });
});

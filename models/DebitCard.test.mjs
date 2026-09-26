import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDebitCardInput } from './DebitCard.js'

test('only 4 digits are accepted', () => {
  assert.equal(normalizeDebitCardInput({ lastFourDigits: ' 12-34 ' }).data.lastFourDigits, '1234')
  assert.ok(normalizeDebitCardInput({ lastFourDigits: '4111111111111111' }).error)
  assert.ok(normalizeDebitCardInput({ lastFourDigits: '123' }).error)
})

test('expiry must be MM/YY', () => {
  assert.equal(normalizeDebitCardInput({ expiry: '08/29' }).error, undefined)
  assert.ok(normalizeDebitCardInput({ expiry: '13/29' }).error)
  assert.ok(normalizeDebitCardInput({ expiry: '8/2029' }).error)
})

test('unknown network falls back and ATM limit is validated', () => {
  assert.equal(normalizeDebitCardInput({ network: 'Diners' }).data.network, 'Other')
  assert.equal(normalizeDebitCardInput({ atmLimit: '' }).data.atmLimit, undefined)
  assert.equal(normalizeDebitCardInput({ atmLimit: '25000' }).data.atmLimit, 25000)
  assert.ok(normalizeDebitCardInput({ atmLimit: -1 }).error)
})

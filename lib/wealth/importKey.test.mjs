import test from 'node:test'
import assert from 'node:assert/strict'
import { withImportKeys, existingImportKeys, looksLikeExistingIncome } from './importKey.js'

const row = (o = {}) => ({ kind: 'expense', date: '2026-11-05', amount: 50, note: 'UPI/Chai Point', ...o })

test('the same row gets the same key every time, whatever the spacing or case', () => {
  const a = withImportKeys([row()], 'a1')[0].importKey
  const b = withImportKeys([row({ note: 'upi  chai point' })], 'a1')[0].importKey
  assert.equal(a, b)
})

test('different account, amount, date or direction gives a different key', () => {
  const base = withImportKeys([row()], 'a1')[0].importKey
  for (const [it, acct] of [[row(), 'a2'], [row({ amount: 51 }), 'a1'], [row({ date: '2026-11-06' }), 'a1'], [row({ kind: 'income' }), 'a1']]) {
    assert.notEqual(withImportKeys([it], acct)[0].importKey, base)
  }
})

test('two identical rows in one file are both kept and both recognised on a second import', () => {
  const first = withImportKeys([row(), row()], 'a1')
  assert.notEqual(first[0].importKey, first[1].importKey)
  const stored = existingImportKeys(first.map((i) => ({ importKey: i.importKey })))
  const again = withImportKeys([row(), row()], 'a1')
  assert.ok(again.every((i) => stored.has(i.importKey)))
  const three = withImportKeys([row(), row(), row()], 'a1') // a third one is genuinely new
  assert.equal(three.filter((i) => !stored.has(i.importKey)).length, 1)
})

test('income already recorded is spotted by account, amount and date', () => {
  const bank = [{ type: 'income', accountId: 'a1', amount: 1000, date: '2026-11-05' }]
  assert.equal(looksLikeExistingIncome({ amount: 1000, date: '2026-11-06' }, 'a1', bank), true)
  assert.equal(looksLikeExistingIncome({ amount: 1000, date: '2026-11-09' }, 'a1', bank), false)
  assert.equal(looksLikeExistingIncome({ amount: 1000, date: '2026-11-05' }, 'a2', bank), false)
})

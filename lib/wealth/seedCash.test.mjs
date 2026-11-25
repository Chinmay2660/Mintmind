import test from 'node:test'
import assert from 'node:assert/strict'
import { seedCashAccount } from './seedCash.js'

const fakeDb = (accounts = []) => ({
  bankAccounts: { toArray: async () => accounts.slice(), put: async (a) => { const i = accounts.findIndex((x) => x.id === a.id); if (i >= 0) accounts[i] = a; else accounts.push(a) } },
})

test('a new profile gets one Cash account at zero, once', async () => {
  const accounts = []
  const db = fakeDb(accounts)
  assert.equal(await seedCashAccount(db, new Date('2026-05-01')), true)
  assert.equal(accounts.length, 1)
  assert.equal(accounts[0].type, 'cash')
  assert.equal(accounts[0].nickname, 'Cash')
  assert.equal(accounts[0].currentBalance, 0)
  assert.equal(accounts[0].lastUpdated, '2026-05-01')
  assert.equal(await seedCashAccount(db), false)
  assert.equal(accounts.length, 1)
})

test('a missing Cash account is created again', async () => {
  const accounts = [{ id: 'b1', type: 'savings' }]
  assert.equal(await seedCashAccount(fakeDb(accounts)), true)
  assert.equal(accounts.filter((a) => a.type === 'cash').length, 1)
})

test('an existing cash account is not duplicated, and "Cash in hand" becomes "Cash"', async () => {
  const accounts = [{ id: 'mine', type: 'cash', nickname: 'Cash in hand', currentBalance: 700 }]
  assert.equal(await seedCashAccount(fakeDb(accounts)), false)
  assert.equal(accounts.length, 1)
  assert.equal(accounts[0].nickname, 'Cash')
  assert.equal(accounts[0].currentBalance, 700)
})

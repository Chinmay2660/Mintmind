import test from 'node:test'
import assert from 'node:assert/strict'
import { seedCashAccount } from './seedCash.js'

const fakeDb = (accounts = [], meta = {}) => ({
  meta: { get: async (k) => (k in meta ? { key: k, value: meta[k] } : undefined), put: async (r) => { meta[r.key] = r.value } },
  bankAccounts: { toArray: async () => accounts, put: async (a) => { accounts.push(a) } },
})

test('a new profile gets one Cash account at zero, once', async () => {
  const accounts = [], meta = {}
  const db = fakeDb(accounts, meta)
  assert.equal(await seedCashAccount(db, new Date('2026-05-01')), true)
  assert.equal(accounts.length, 1)
  assert.equal(accounts[0].type, 'cash')
  assert.equal(accounts[0].currentBalance, 0)
  assert.equal(accounts[0].lastUpdated, '2026-05-01')
  assert.equal(meta.cashSeeded, true)
  assert.equal(await seedCashAccount(db), false)
  assert.equal(accounts.length, 1)
})

test('a deleted Cash account stays deleted', async () => {
  const accounts = [], meta = { cashSeeded: true }
  assert.equal(await seedCashAccount(fakeDb(accounts, meta)), false)
  assert.equal(accounts.length, 0)
})

test('an existing cash account is not duplicated but the flag is set', async () => {
  const accounts = [{ id: 'mine', type: 'cash' }], meta = {}
  assert.equal(await seedCashAccount(fakeDb(accounts, meta)), false)
  assert.equal(accounts.length, 1)
  assert.equal(meta.cashSeeded, true)
})

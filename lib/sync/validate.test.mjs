import test from 'node:test'
import assert from 'node:assert/strict'
import { parseOps, MAX_OPS } from './validate.js'

test('accepts puts and deletes for known tables', () => {
  const r = parseOps({ ops: [{ table: 'goals', key: 'g1', data: { id: 'g1' } }, { table: 'expenses', key: 'e1', deleted: true }] })
  assert.equal(r.ok, true)
  assert.deepEqual(r.ops[1], { table: 'expenses', key: 'e1', deleted: true })
})

test('rejects unknown tables, bad keys and bad data', () => {
  assert.equal(parseOps({ ops: [{ table: 'users', key: 'a', data: {} }] }).ok, false)
  assert.equal(parseOps({ ops: [{ table: 'goals', key: '', data: {} }] }).ok, false)
  assert.equal(parseOps({ ops: [{ table: 'goals', key: 'a', data: [] }] }).ok, false)
  assert.equal(parseOps({ ops: 'x' }).ok, false)
})

test('limits the batch and the size of a record', () => {
  assert.equal(parseOps({ ops: Array.from({ length: MAX_OPS + 1 }, (_, i) => ({ table: 'goals', key: `g${i}`, deleted: true })) }).ok, false)
  assert.equal(parseOps({ ops: [{ table: 'documents', key: 'd', data: { blob: 'x'.repeat(1_100_000) } }] }).ok, false)
})

test('device-only meta keys are never stored', () => {
  const r = parseOps({ ops: [{ table: 'meta', key: 'seeded', data: { key: 'seeded' } }, { table: 'meta', key: 'prefs', data: { key: 'prefs' } }] })
  assert.deepEqual(r.ops.map((o) => o.key), ['prefs'])
})

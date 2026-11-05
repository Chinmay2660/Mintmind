import test from 'node:test'
import assert from 'node:assert/strict'
import { advance, confirmSafe } from './stateMachine.js'

const base = { enabled: true, inactivityDays: 90, reminderLeadDays: 7, confirmDays: 7, graceDays: 14, state: 'monitoring' }
const at = (iso) => new Date(iso)
const day = (n) => new Date(Date.UTC(2025, 0, 1) + n * 86400000)

test('nothing happens while active', () => {
  const r = advance({ ...base, lastActiveAt: day(0) }, day(30))
  assert.equal(r.state, 'monitoring')
  assert.deepEqual(r.actions, [])
})

test('full workflow in order, one step at a time', () => {
  let cfg = { ...base, lastActiveAt: day(0) }
  let r = advance(cfg, day(83))
  assert.equal(r.state, 'reminded'); assert.deepEqual(r.actions, ['email_owner_reminder'])
  cfg = { ...cfg, ...r.patch }
  assert.equal(advance(cfg, day(85)).state, 'reminded')
  r = advance(cfg, day(90))
  assert.equal(r.state, 'awaiting_confirmation'); assert.deepEqual(r.actions, ['push_owner', 'email_owner_confirm'])
  cfg = { ...cfg, ...r.patch }
  assert.equal(advance(cfg, day(95)).state, 'awaiting_confirmation')
  r = advance(cfg, day(97))
  assert.equal(r.state, 'contacts_notified'); assert.deepEqual(r.actions, ['notify_contacts'])
  cfg = { ...cfg, ...r.patch }
  assert.equal(advance(cfg, day(100)).state, 'contacts_notified') // still in grace
  r = advance(cfg, day(111))
  assert.equal(r.state, 'released')
})

test('owner activity before release resets to monitoring; disabled does nothing', () => {
  const cfg = { ...base, state: 'awaiting_confirmation', lastActiveAt: day(95), confirmDeadline: day(97) }
  assert.equal(advance(cfg, day(96)).state, 'monitoring')
  assert.equal(advance({ ...base, enabled: false, lastActiveAt: day(0) }, day(300)).state, 'monitoring')
  assert.equal(confirmSafe(day(5)).state, 'monitoring')
})

test('released state is not auto-reset by the machine (owner must explicitly confirm)', () => {
  const cfg = { ...base, state: 'released', lastActiveAt: day(200) }
  assert.equal(advance(cfg, day(201)).state, 'released')
  void at
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { GROUPS, VIEWS, VIEW_LABEL, groupOf, viewFor, KEY_GROUPS } from './budgetTabs.js'

test('four sections, and every one of the nine views belongs to exactly one', () => {
  assert.equal(GROUPS.length, 4)
  const all = GROUPS.flatMap((g) => g.views)
  assert.equal(all.length, VIEWS.length)
  assert.deepEqual([...all].sort(), [...VIEWS].sort())
  for (const v of VIEWS) assert.ok(VIEW_LABEL[v], `label for ${v}`)
})

test('a view maps to its section, and a section opens on the view you used last', () => {
  assert.equal(groupOf('calendar'), 'transactions')
  assert.equal(groupOf('review'), 'transactions')
  assert.equal(groupOf('cashflow'), 'insights')
  assert.equal(groupOf('nonsense'), 'overview')
  assert.equal(viewFor('insights'), 'monthly')
  assert.equal(viewFor('insights', { insights: 'stats' }), 'stats')
  assert.equal(viewFor('insights', { insights: 'calendar' }), 'monthly') // a stale value from another section is ignored
  assert.equal(viewFor('nope'), 'overview')
})

test('the number keys reach every section', () => {
  assert.deepEqual(Object.values(KEY_GROUPS).sort(), GROUPS.map((g) => g.key).sort())
})

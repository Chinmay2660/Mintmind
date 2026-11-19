import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanName, childOf, groupCategories, makeSub, parentOf } from './subcategories.js'

test('parent and child names', () => {
  assert.equal(makeSub('Food', 'Dining out'), 'Food > Dining out')
  assert.equal(parentOf('Food > Dining out'), 'Food')
  assert.equal(childOf('Food > Dining out'), 'Dining out')
  assert.equal(parentOf('Food'), 'Food')
  assert.equal(childOf('Food'), null)
})
test('names cannot contain the separator', () => assert.equal(cleanName(' A > B '), 'A B'))
test('grouping keeps list order and invents a missing parent', () => {
  const g = groupCategories(['Bills', 'Food', 'Food > Dining', 'Travel > Cab'])
  assert.deepEqual(g.map((x) => [x.name, x.children.length]), [['Bills', 0], ['Food', 1], ['Travel', 1]])
})

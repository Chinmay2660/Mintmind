import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyDocument, searchDocuments } from './documents.js'

test('classifies by file name and suggests a name', () => {
  assert.equal(classifyDocument('PAN_card_scan.pdf').category, 'Identity')
  const p = classifyDocument('star-health-policy-2026.pdf')
  assert.equal(p.category, 'Insurance')
  assert.match(p.suggestedName, /Insurance policy, 2026/)
  assert.equal(classifyDocument('hdfc_statement_Oct-2025.pdf').period, 'Oct 2025')
  assert.equal(classifyDocument('IMG_0042.jpg').category, null)
})

test('document search ranks matches and ignores filler words', () => {
  const docs = [{ name: 'Home loan sanction', category: 'Property', uploaded: '2026-01-01' }, { name: 'PAN card', category: 'Identity', uploaded: '2026-02-01' }, { name: 'Loan statement', category: 'Bank', uploaded: '2026-03-01' }]
  const r = searchDocuments('show all documents related to my home loan', docs)
  assert.equal(r[0].name, 'Home loan sanction')
  assert.ok(!r.some((d) => d.name === 'PAN card'))
})

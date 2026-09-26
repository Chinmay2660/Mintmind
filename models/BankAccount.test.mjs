import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeBankAccountInput } from './BankAccount.js'

test('IFSC is uppercased and validated', () => {
  assert.equal(normalizeBankAccountInput({ ifscCode: ' hdfc0000240 ' }).data.ifscCode, 'HDFC0000240')
  assert.ok(normalizeBankAccountInput({ ifscCode: 'HDFC000024' }).error)
  assert.ok(normalizeBankAccountInput({ ifscCode: 'HDFC1000240' }).error)
  assert.equal(normalizeBankAccountInput({ ifscCode: '' }).error, undefined)
})

test('account name is derived from bank and type', () => {
  assert.equal(normalizeBankAccountInput({ bankName: ' HDFC Bank ', accountType: 'Salary', accountName: 'x' }).data.accountName, 'HDFC Bank - Salary')
  assert.equal(normalizeBankAccountInput({ bankName: 'ICICI', accountType: 'Credit Card', accountName: 'Amazon Pay' }).data.accountName, 'Amazon Pay')
})

test('joint fields are cleared for individual and defaulted for joint', () => {
  const individual = normalizeBankAccountInput({ ownershipType: 'Individual', jointHolders: 'X', operationMode: 'Jointly' }).data
  assert.equal(individual.jointHolders, '')
  assert.equal(individual.operationMode, '')

  const joint = normalizeBankAccountInput({ ownershipType: 'Joint', operationMode: 'bogus' }).data
  assert.equal(joint.operationMode, 'Either or Survivor')
})

export function toStoreDoc(doc) {
  if (!doc) return doc
  const id = doc._id?.toString?.() ?? doc._id
  return { ...doc, _id: id }
}

export function resolveRefId(ref) {
  if (!ref) return null
  if (typeof ref === 'object') return ref._id?.toString?.() ?? ref._id
  return ref
}

function findRef(id, items, fallback) {
  if (!id) return fallback ?? null
  const match = items.find((item) => item._id === id)
  if (match) return match
  if (fallback && typeof fallback === 'object') return fallback
  return id
}

export function populateRefs(record, fields, lookup) {
  const populated = { ...record }
  for (const field of fields) {
    const refId = resolveRefId(record[field])
    populated[field] = findRef(refId, lookup[field] ?? [], record[field])
  }
  return populated
}

export function populateTransaction(transaction, categories = [], accounts = []) {
  return populateRefs(transaction, ['categoryId', 'accountId'], {
    categoryId: categories,
    accountId: accounts,
  })
}

export function populateBudget(budget, categories = []) {
  return populateRefs(budget, ['categoryId'], { categoryId: categories })
}

export function populateInvestment(investment, accounts = []) {
  return populateRefs(investment, ['accountId'], { accountId: accounts })
}

export function populateSalaryRecord(salary, categories = [], accounts = []) {
  return populateRefs(salary, ['categoryId', 'accountId'], {
    categoryId: categories,
    accountId: accounts,
  })
}

export function populateRecurringExpense(expense, categories = [], accounts = []) {
  return populateRefs(expense, ['categoryId', 'accountId'], {
    categoryId: categories,
    accountId: accounts,
  })
}

export function toApiPayload(record) {
  const payload = { ...record }
  delete payload._id
  delete payload._syncStatus
  delete payload.createdAt
  delete payload.updatedAt
  delete payload.__v
  delete payload.userId
  delete payload.familyId
  delete payload.createdBy

  for (const key of ['categoryId', 'accountId', 'transferToAccountId']) {
    if (payload[key] && typeof payload[key] === 'object') {
      payload[key] = resolveRefId(payload[key])
    }
  }

  return payload
}

export function unwrapEntityResponse(data, wrapKey) {
  if (!wrapKey) return data
  return data?.[wrapKey] ?? null
}

export function wrapEntityResponse(doc, wrapKey) {
  if (!wrapKey) return doc
  return { [wrapKey]: doc ?? null }
}

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

export function populateTransaction(transaction, categories = [], accounts = []) {
  const categoryId = resolveRefId(transaction.categoryId)
  const accountId = resolveRefId(transaction.accountId)

  const category =
    categories.find((item) => item._id === categoryId) ??
    (typeof transaction.categoryId === 'object' ? transaction.categoryId : null)

  const account =
    accounts.find((item) => item._id === accountId) ??
    (typeof transaction.accountId === 'object' ? transaction.accountId : null)

  return {
    ...transaction,
    categoryId: category ?? categoryId,
    accountId: account ?? accountId,
  }
}

export function toApiPayload(record) {
  const payload = { ...record }
  delete payload._id
  delete payload._syncStatus
  delete payload.createdAt
  delete payload.updatedAt
  delete payload.__v
  delete payload.userId

  if (payload.categoryId && typeof payload.categoryId === 'object') {
    payload.categoryId = resolveRefId(payload.categoryId)
  }
  if (payload.accountId && typeof payload.accountId === 'object') {
    payload.accountId = resolveRefId(payload.accountId)
  }

  return payload
}

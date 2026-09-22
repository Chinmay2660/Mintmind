export function matchRule(rule, transaction) {
  if (!rule.enabled) return false;
  const { field, operator, value } = rule.conditions;
  const target = field === 'amount' ? String(transaction.amount) : (transaction.description || '').toLowerCase();
  const compare = value.toLowerCase();

  switch (operator) {
    case 'contains': return target.includes(compare);
    case 'equals': return target === compare;
    case 'startsWith': return target.startsWith(compare);
    case 'greaterThan': return Number(transaction.amount) > Number(value);
    case 'lessThan': return Number(transaction.amount) < Number(value);
    default: return false;
  }
}

export function applyRules(rules, transaction) {
  const sorted = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const rule of sorted) {
    if (!matchRule(rule, transaction)) continue;
    const updates = {};
    if (rule.actions.categoryId) updates.categoryId = rule.actions.categoryId;
    if (rule.actions.subcategoryId) updates.subcategoryId = rule.actions.subcategoryId;
    if (rule.actions.tagIds?.length) updates.tagIds = rule.actions.tagIds;
    if (rule.actions.type) updates.type = rule.actions.type;
    return updates;
  }
  return null;
}

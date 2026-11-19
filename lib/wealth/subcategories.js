/** Sub categories are ordinary categories named "Parent > Child", so every list, filter and total keeps working. */
export const SEP = ' > '
export const parentOf = (c) => (typeof c === 'string' && c.includes(SEP) ? c.split(SEP)[0] : c)
export const childOf = (c) => (typeof c === 'string' && c.includes(SEP) ? c.slice(c.indexOf(SEP) + SEP.length) : null)
export const makeSub = (parent, child) => `${parent}${SEP}${child}`
/** Names may not contain the separator, so a parent can never be confused with a child. */
export const cleanName = (n) => String(n || '').replace(/\s*>\s*/g, ' ').trim()

/** [{ name, children: ['Parent > Child', ...] }], parents in list order. A child whose parent is not listed gets that parent. */
export function groupCategories(list = []) {
  const groups = new Map()
  for (const c of list) { const p = parentOf(c); if (!groups.has(p)) groups.set(p, { name: p, children: [] }); if (childOf(c)) groups.get(p).children.push(c) }
  return [...groups.values()]
}

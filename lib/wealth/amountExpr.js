// Calculator-style amount entry ("120+45.5*2"): pure helpers, no eval.
// Operators are + - * /. Multiplication and division bind tighter than addition and subtraction.

export const OPERATORS = ['+', '-', '*', '/']
const isOp = (c) => OPERATORS.includes(c)

/** Result of the expression, or null when it is incomplete, invalid or not finite. */
export function evalAmount(expr) {
  const s = String(expr ?? '').replace(/\s+/g, '')
  if (!s || !/^[0-9.+\-*/]+$/.test(s)) return null
  const tokens = s.match(/\d*\.?\d+|\d+\.|[+\-*/]/g)
  if (!tokens || tokens.join('') !== s) return null

  const nums = []
  const ops = []
  let expectNum = true
  for (const t of tokens) {
    if (expectNum) {
      if (isOp(t)) return null
      nums.push(Number(t))
      expectNum = false
    } else {
      if (!isOp(t)) return null
      ops.push(t)
      expectNum = true
    }
  }
  if (expectNum) return null // trailing operator

  // First pass: * and /
  const n2 = [nums[0]]
  const o2 = []
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const rhs = nums[i + 1]
    if (op === '*') n2[n2.length - 1] *= rhs
    else if (op === '/') {
      if (rhs === 0) return null
      n2[n2.length - 1] /= rhs
    } else {
      o2.push(op)
      n2.push(rhs)
    }
  }
  let total = n2[0]
  o2.forEach((op, i) => { total = op === '+' ? total + n2[i + 1] : total - n2[i + 1] })
  if (!Number.isFinite(total)) return null
  return Math.round(total * 100) / 100
}

export const hasOperator = (expr) => /[+\-*/]/.test(String(expr ?? ''))

/** Applies one key press (digit, '.', operator or 'back') to the current expression. */
export function pressKey(expr, key) {
  const s = String(expr ?? '')
  if (key === 'back') return s.slice(0, -1)
  if (key === 'clear') return ''
  const last = s.slice(-1)
  const currentNumber = s.split(/[+\-*/]/).pop() || ''

  if (isOp(key)) {
    if (!s) return key === '-' ? '' : '' // nothing to operate on yet
    if (isOp(last)) return s.slice(0, -1) + key // replace a dangling operator
    if (last === '.') return s.slice(0, -1) + key
    return s + key
  }
  if (key === '.') {
    if (currentNumber.includes('.')) return s
    return s + (currentNumber === '' ? '0.' : '.')
  }
  if (/^\d$/.test(key)) {
    const [, dec] = currentNumber.split('.')
    if (dec !== undefined && dec.length >= 2) return s // paise precision
    if (currentNumber === '0' && key !== '0') return s.slice(0, -1) + key // no leading zero
    if (currentNumber === '0' && key === '0') return s
    if (currentNumber.replace('.', '').length >= 10) return s
    return s + key
  }
  return s
}

/** Display form: * and / and - shown as × ÷ −, grouped with Indian separators. */
export function displayExpr(expr) {
  return String(expr ?? '').replace(/\d+(\.\d*)?/g, (n) => {
    const [i, d] = n.split('.')
    const grouped = Number(i).toLocaleString('en-IN')
    return d === undefined ? grouped : `${grouped}.${d}`
  }).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−')
}

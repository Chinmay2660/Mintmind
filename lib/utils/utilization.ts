/** Utilization bar: ≤10% green, (10–30%] orange, (30–80%] amber, (80–100%] red */
export function getUtilizationBarClass(utilizationPercent: number): string {
  if (utilizationPercent <= 10) return 'bg-emerald-500'
  if (utilizationPercent <= 30) return 'bg-orange-500'
  if (utilizationPercent >= 80) return 'bg-red-500'
  return 'bg-amber-500'
}

// ponytail: self-check — upgrade path: move to a test file if more cases are added
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`utilization: ${msg}`)
  }
  assert(getUtilizationBarClass(0) === 'bg-emerald-500', '0% green')
  assert(getUtilizationBarClass(10) === 'bg-emerald-500', '10% green')
  assert(getUtilizationBarClass(20) === 'bg-orange-500', '20% orange')
  assert(getUtilizationBarClass(50) === 'bg-amber-500', '50% amber')
  assert(getUtilizationBarClass(90) === 'bg-red-500', '90% red')
}

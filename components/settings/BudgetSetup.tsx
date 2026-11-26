'use client'

import { TabBar } from '@/components/ui/tab-bar'
import { useState } from 'react'
import { toast } from 'sonner'
import { useWealth } from '@/lib/wealth/WealthContext'
import { save } from '@/lib/wealth/actions'
import { addMonths, toISO, istNow } from '@/lib/wealth/calc'
import { useCategories } from '@/lib/wealth/useCategories'
import { groupCategories } from '@/lib/wealth/subcategories'
import { planFor } from '@/lib/wealth/incomeBudget'
import { MonthPicker } from '@/components/ui/pickers'
import { BudgetEditor, type EditorGroup } from '@/components/wealth/budget/BudgetEditor'
import { BudgetForm } from '@/components/wealth/budget/BudgetForm'
import type { IncomePlan } from '@/components/wealth/budget/IncomeBudget'

/**
 * Settings > Budget > Budgets: set the limits for a month, the way a money manager app does. Pick the month, then give the month a
 * total and a limit for each category, with its sub-categories one tap down. Expense and income each have their own. How you are doing
 * against it is on the Budget page; nothing about spending is shown here.
 */
export function BudgetSetup() {
  const { data, db } = useWealth()
  const { expense, income } = useCategories()
  const curYm = toISO(istNow()).slice(0, 7)
  const [ym, setYm] = useState(curYm)
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [advanced, setAdvanced] = useState(false)

  const budget = data.budgets.find((b: any) => b.id === ym)
  const prevYm = addMonths(`${ym}-01`, -1).slice(0, 7)
  const prevBudget = data.budgets.find((b: any) => b.id === prevYm)
  const plans = (data.meta.find((m: any) => m.key === 'incomeBudgets')?.value ?? {}) as Record<string, IncomePlan>
  const plan = planFor(plans, ym)
  const prevPlan = planFor(plans, prevYm)
  const monthName = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const step = (by: number) => setYm((cur) => { const next = addMonths(`${cur}-01`, by).slice(0, 7); return next > addMonths(`${curYm}-01`, 12).slice(0, 7) ? cur : next })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" onClick={() => step(-1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground">‹</button>
          <MonthPicker value={ym} max={addMonths(`${curYm}-01`, 12).slice(0, 7)} onChange={setYm} className="min-w-32 justify-center" />
          <button type="button" aria-label="Next month" onClick={() => step(1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground">›</button>
        </div>
      </div>
      <TabBar label="Which budget" className="mx-0" value={kind} onChange={(k) => setKind(k as 'expense' | 'income')} tabs={[{ key: 'expense', label: 'Expense' }, { key: 'income', label: 'Income' }]} />
      <p className="px-1 text-xs text-muted-foreground">Setting the budget for <strong className="font-semibold text-foreground">{monthName}</strong>.</p>
      {kind === 'expense' ? (
        <BudgetEditor
          key={`expense|${ym}|${budget?.total ?? 0}|${JSON.stringify(budget?.categories ?? {})}`}
          groups={groupCategories(expense) as EditorGroup[]}
          values={(budget?.categories ?? {}) as Record<string, number>}
          total={budget?.total ?? 0}
          totalLabel="Monthly budget"
          copyFrom={prevBudget ? { total: prevBudget.total, values: (prevBudget.categories ?? {}) as Record<string, number> } : null}
          copyLabel="Copy last month"
          onMore={budget ? () => setAdvanced(true) : undefined}
          onSave={async (t, map) => {
            const sum = Object.values(map).reduce((x, y) => x + y, 0)
            const total = t > 0 ? t : sum
            if (!(total > 0)) { toast.warning('Enter a monthly budget, or a limit for at least one category'); return }
            const base = budget ?? { rollover: false, rolloverCats: [], periods: {} }
            await save(db, 'budgets', { ...base, id: ym, total, categories: map })
            toast.success('Budget saved')
          }}
        />
      ) : (
        <BudgetEditor
          key={`income|${ym}|${plan?.total ?? 0}|${JSON.stringify(plan?.categories ?? {})}`}
          groups={income.map((c) => ({ name: c, children: [] }))}
          values={plan?.categories ?? {}}
          total={plan?.total ?? 0}
          totalLabel="Expected income"
          copyFrom={prevPlan && prevPlan !== plan ? { total: prevPlan.total, values: prevPlan.categories ?? {} } : null}
          copyLabel="Copy last month"
          onSave={async (t, map) => {
            const sum = Object.values(map).reduce((x, y) => x + y, 0)
            const total = t > 0 ? t : sum
            if (!(total > 0)) { toast.warning('Enter the income you expect, or an amount for at least one category'); return }
            await db.meta.put({ key: 'incomeBudgets', value: { ...plans, [ym]: { total, categories: map } } })
            toast.success('Income budget saved')
          }}
        />
      )}
      {advanced && <BudgetForm ym={ym} row={budget} onClose={() => setAdvanced(false)} onSave={async (r: any) => { await save(db, 'budgets', r); toast.success('Budget saved') }} />}
    </div>
  )
}

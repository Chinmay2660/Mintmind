import { redirect } from 'next/navigation'

export default function BudgetAnalysisRedirect() {
  redirect('/dashboard/stats/categories')
}

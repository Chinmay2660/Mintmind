import { redirect } from 'next/navigation'

// The statement is a report now: Settings > Import & export > Net worth, as Excel or PDF. Old links land there.
export default function StatementMoved() {
  redirect('/dashboard/settings?tab=reports')
}

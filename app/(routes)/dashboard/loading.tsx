// Shown instantly while a dashboard route loads, so navigation never feels stalled.
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}

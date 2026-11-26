'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

const FIRST = 5, MORE = 20

/**
 * Every history in the app: the latest five at first, never the whole record. "View all" opens the rest in a list that loads more
 * as it is scrolled, so a long history is never put on the page at once. `rows` must be newest first.
 */
export function HistoryList<T>({ rows, getKey, children, itemClass = 'flex items-center justify-between gap-3 py-2.5 text-sm', empty }: {
  rows: T[]; getKey: (row: T) => string; children: (row: T) => ReactNode; itemClass?: string; empty?: ReactNode
}) {
  const [all, setAll] = useState(false)
  const [n, setN] = useState(MORE)
  const box = useRef<HTMLUListElement>(null)
  const end = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const el = end.current
    if (!all || !el) return
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) setN((v) => v + MORE) }, { root: box.current })
    io.observe(el)
    return () => io.disconnect()
  }, [all, n])
  if (rows.length === 0) return <>{empty ?? null}</>
  const shown = all ? rows.slice(0, n) : rows.slice(0, FIRST)
  return (
    <>
      <ul ref={box} className={all ? 'max-h-96 divide-y divide-border overflow-y-auto' : 'divide-y divide-border'}>
        {shown.map((r) => <li key={getKey(r)} className={itemClass}>{children(r)}</li>)}
        {all && n < rows.length && <li ref={end} aria-hidden className="h-6" />}
      </ul>
      {rows.length > FIRST && (
        <button type="button" onClick={() => { setAll((v) => !v); setN(MORE) }} className="mt-2 flex min-h-10 w-full items-center justify-center text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          {all ? 'Show less' : `View all (${rows.length})`}
        </button>
      )}
    </>
  )
}

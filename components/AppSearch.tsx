'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import {
  DASHBOARD_SEARCH_ALL,
  type SearchItem,
} from '@/lib/constants/dashboardNav'
import { useAppSearch } from '@/contexts/AppSearchContext'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

function matchesQuery(item: SearchItem, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const haystack = [item.name, ...(item.keywords ?? [])].join(' ').toLowerCase()
  return haystack.includes(q)
}

function groupLabel(group: SearchItem['group']): string {
  if (group === 'actions') return 'Quick actions'
  return 'Pages'
}

export default function AppSearch() {
  const router = useRouter()
  const { isOpen, close } = useAppSearch()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(
    () => DASHBOARD_SEARCH_ALL.filter((item) => matchesQuery(item, query)),
    [query]
  )

  const grouped = useMemo(() => {
    const pages = results.filter((item) => item.group !== 'actions')
    const actions = results.filter((item) => item.group === 'actions')
    return [
      ...(pages.length ? [{ key: 'pages' as const, items: pages }] : []),
      ...(actions.length ? [{ key: 'actions' as const, items: actions }] : []),
    ]
  }, [results])

  const flatResults = useMemo(
    () => grouped.flatMap((group) => group.items),
    [grouped]
  )

  const navigate = useCallback(
    (path: string) => {
      close()
      router.push(path)
    },
    [close, router]
  )

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setActiveIndex(0)
      return
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]')
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(flatResults.length, 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) =>
        prev === 0 ? Math.max(flatResults.length - 1, 0) : prev - 1
      )
      return
    }

    if (event.key === 'Enter' && flatResults[activeIndex]) {
      event.preventDefault()
      navigate(flatResults[activeIndex].path)
    }
  }

  let runningIndex = -1

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl [&>button]:hidden"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>

        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/50 px-3 dark:bg-muted/30">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search pages and actions..."
              className="h-11 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div ref={listRef} className="max-h-[min(60dvh,320px)] overflow-y-auto px-2 py-2">
          {flatResults.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.key} className="mb-1 last:mb-0">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {groupLabel(group.key)}
                </p>
                <ul>
                  {group.items.map((item) => {
                    runningIndex += 1
                    const index = runningIndex
                    const Icon = item.icon
                    const isActive = index === activeIndex

                    return (
                      <li key={`${item.group}-${item.path}`}>
                        <button
                          type="button"
                          data-active={isActive}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/50'
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => navigate(item.path)}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="hidden items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground sm:flex">
          <span>Navigate with ↑↓</span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ↵
            </kbd>{' '}
            to open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

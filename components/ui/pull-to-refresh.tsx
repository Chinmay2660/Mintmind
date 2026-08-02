'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

const THRESHOLD = 72
const MAX_PULL = 100

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const isMobile = useIsMobile()
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const pulling = useRef(false)
  const pullRef = useRef(0)
  const onRefreshRef = useRef(onRefresh)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!isMobile) return
    const el = containerRef.current
    if (!el) return

    const atTop = () => window.scrollY <= 0

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return
      if (atTop()) {
        startY.current = e.touches[0].clientY
        pulling.current = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshing) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0 && atTop()) {
        e.preventDefault()
        const next = Math.min(dy * 0.5, MAX_PULL)
        pullRef.current = next
        setPull(next)
      } else if (dy <= 0) {
        pulling.current = false
        pullRef.current = 0
        setPull(0)
      }
    }

    const onTouchEnd = async () => {
      if (!pulling.current) return
      pulling.current = false
      const currentPull = pullRef.current

      if (currentPull >= THRESHOLD) {
        setRefreshing(true)
        setPull(THRESHOLD)
        try {
          await onRefreshRef.current()
        } finally {
          setRefreshing(false)
          pullRef.current = 0
          setPull(0)
        }
        return
      }

      pullRef.current = 0
      setPull(0)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [isMobile, refreshing])

  if (!isMobile) {
    return <div className={className}>{children}</div>
  }

  const progress = Math.min(pull / THRESHOLD, 1)
  const indicatorHeight = pull > 0 || refreshing ? Math.max(pull, refreshing ? THRESHOLD : 0) : 0

  return (
    <div ref={containerRef} className={cn('relative touch-pan-y overscroll-y-contain', className)}>
      <div
        className="pointer-events-none absolute left-0 right-0 z-20 flex justify-center"
        style={{ height: indicatorHeight, opacity: indicatorHeight > 0 ? 1 : 0 }}
        aria-hidden
      >
        <Loader2
          className={cn(
            'mt-2 h-5 w-5 text-primary',
            (refreshing || progress >= 1) && 'animate-spin'
          )}
          style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
        />
      </div>
      <div
        className="transition-transform duration-200 ease-out"
        style={{ transform: pull > 0 ? `translateY(${pull}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  )
}

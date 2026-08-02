let scrollRestorationSet = false

export function scrollPageToTop() {
  if (typeof window === 'undefined') return

  if (!scrollRestorationSet) {
    history.scrollRestoration = 'manual'
    scrollRestorationSet = true
  }

  const reset = () => {
    window.scrollTo({ top: 0, left: 0 })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  reset()
  // ponytail: double-rAF beats Next.js restoring scroll after navigation
  requestAnimationFrame(() => {
    reset()
    requestAnimationFrame(reset)
  })
}

export function scrollActiveTabIntoView(container: HTMLElement | null) {
  if (!container) return
  const activeEl = container.querySelector<HTMLElement>('[data-active="true"]')
  if (!activeEl) return
  const targetLeft = activeEl.offsetLeft - (container.clientWidth - activeEl.offsetWidth) / 2
  container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
}

export function scrollPageToTop() {
  if (typeof window === 'undefined') return
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

export function scrollActiveTabIntoView(container: HTMLElement | null) {
  if (!container) return
  const activeEl = container.querySelector<HTMLElement>('[data-active="true"]')
  if (!activeEl) return
  const targetLeft = activeEl.offsetLeft - (container.clientWidth - activeEl.offsetWidth) / 2
  container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
}

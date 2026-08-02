export function withFromHome(href: string): string {
  const [path, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  params.set('from', 'home')
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export function isFromHome(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('from') === 'home'
}

export function withFromHome(href: string): string {
  const [path, query = ''] = href.split('?')
  const params = new URLSearchParams(query)
  params.set('from', 'home')
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}
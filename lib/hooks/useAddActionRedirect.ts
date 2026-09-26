'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/** Open add sheet or redirect `?action=add` deep-links. */
export function useAddActionRedirect(hrefOrOpen: string | (() => void)) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('action') !== 'add') return
    if (typeof hrefOrOpen === 'function') {
      hrefOrOpen()
      const rest = new URLSearchParams(searchParams.toString())
      rest.delete('action')
      router.replace(rest.size ? `${pathname}?${rest}` : pathname)
    } else {
      router.replace(hrefOrOpen)
    }
  }, [searchParams, router, pathname, hrefOrOpen])
}

/** Open edit sheet from `?edit=id` deep-links (legacy /[id] routes redirect here). */
export function useEditActionRedirect(openSheet: (id: string) => void) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId) return
    openSheet(editId)
    router.replace(pathname)
  }, [searchParams, router, pathname, openSheet])
}

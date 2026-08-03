'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/** Redirect `?action=add` deep-links to the entity create page. */
export function useAddActionRedirect(href: string) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      router.replace(href)
    }
  }, [searchParams, router, href])
}

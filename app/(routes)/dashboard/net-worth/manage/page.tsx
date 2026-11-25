'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Assets now live in Investments (Property & other). Old links and bookmarks land there, keeping ?add=asset. */
export default function AssetsRedirect() {
  const router = useRouter()
  useEffect(() => {
    const add = new URLSearchParams(window.location.search).get('add')
    router.replace('/dashboard/mutual-funds?tab=property' + (add === 'asset' ? '&add=asset' : ''))
  }, [router])
  return null
}

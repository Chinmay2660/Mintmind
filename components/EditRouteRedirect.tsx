'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/** Legacy /[id] edit routes → list page with edit sheet open. */
export function EditRouteRedirect({ listPath }: { listPath: string }) {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    router.replace(`${listPath}?edit=${id}`)
  }, [id, listPath, router])

  return null
}

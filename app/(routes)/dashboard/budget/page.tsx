'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const Budget = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/categories')
  }, [router])

  return (
    <div className="p-4 md:p-8">
      <p className="text-muted-foreground">Redirecting to categories...</p>
    </div>
  )
}

export default Budget
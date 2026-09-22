'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ExpensesComponent = ({ params }) => {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/transactions')
  }, [router])

  return (
    <div>
      <p className="text-muted-foreground">Redirecting to transactions...</p>
    </div>
  )
}

export default ExpensesComponent

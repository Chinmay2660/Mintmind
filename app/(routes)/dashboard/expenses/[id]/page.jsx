'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ExpensesComponent = ({ params }) => {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/transactions')
  }, [router])

  return (
    <div className="p-4 md:p-8">
      <p className="text-gray-500">Redirecting to transactions...</p>
    </div>
  )
}

export default ExpensesComponent

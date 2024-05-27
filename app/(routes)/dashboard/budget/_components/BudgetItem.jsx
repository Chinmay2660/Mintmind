import React from 'react'
import { useRouter } from 'next/navigation'

const BudgetItem = ({ budget }) => {
    const router = useRouter()
    const calculateProgressPercentage = () => {
        if(budget.totalSpend >= budget.amount){
            return 100
        }
        const percentage = (budget.totalSpend / budget.amount) * 100
        return percentage.toFixed(2)
    }

    const handleRedirect = () => {
        const targetPath = '/dashboard/expenses/' + budget?.id
        if (window.location.pathname !== targetPath) {
            router.push(targetPath)
        }
    }

    return (
        <div onClick={handleRedirect} className='p-5 border rounded-lg hover:shadow-md cursor-pointer h-[170px]' >
            <div className='flex gap-2 items-center justify-between'>
                <div className='flex gap-2 items-center'>
                    <h2 className='text-2xl p-3 bg-slate-100 rounded-full'>{budget?.icon}</h2>
                    <div>
                        <h2 className='font-bold'>{budget.name}</h2>
                        <h2 className='text-sm text-gray-500'>{budget.totalItem} Item</h2>
                    </div>
                </div>
                <h2 className='font-bold text-primary text-lg'>₹{budget.amount}</h2>
            </div>
            <div className='mt-5'>
                <div className='flex items-center justify-between mb-3'>
                    <h2 className='text-xs text-slate-400'>₹{budget.totalSpend ? budget.totalSpend : 0} Spend</h2>
                    <h2 className='text-xs text-slate-400'>₹{budget.amount - budget.totalSpend} Remaining</h2>
                </div>
                <div className='w-full bg-slate-300 h-2 rounded-full'>
                    <div className='bg-primary h-2 rounded-full' style={{ width: `${calculateProgressPercentage()}%`, backgroundColor: budget.totalSpend >= budget.amount ? "red" : "" }}>

                    </div>
                </div>
            </div>
        </div>
    )
}

export default BudgetItem
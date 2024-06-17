import { db } from '@/utils/dbConfig'
import { Expenses } from '@/utils/schema'
import { eq } from 'drizzle-orm'
import { Trash } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'

const ExpenseListTable = ({ expenseList, refreshData }) => {
    const deleteExpense = async (expense) => {
        const result = await db.delete(Expenses)
            .where(eq(Expenses.id, expense.id))
            .returning()
        if (result) {
            refreshData()
            toast.success('Expense Deleted!', {
                style: {
                    background: 'green',
                    color: 'white'
                }
            })
        }
    }

    return (
        <div className='mt-3'>
            <h2 className='font-bold text-lg'>Latest Expenses</h2>
            <div className='grid grid-cols-4 bg-slate-200 p-2 font-bold mt-3'>
                <h2>Name</h2>
                <h2>Amount</h2>
                <h2>Date</h2>
                <h2>Action</h2>
            </div>
            {expenseList?.length > 0 && expenseList?.map((expense, index) => (
                <div key={index} className='grid grid-cols-4 bg-slate-50 p-2'>
                    <h2>{expense.name}</h2>
                    <h2>{expense.amount}</h2>
                    <h2>{expense.createdAt}</h2>
                    <h2>
                        <Trash onClick={() => deleteExpense(expense)} className='text-red-600 cursor-pointer' />
                    </h2>
                </div>
            ))}
            {expenseList?.length === 0 &&
                <div className='bg-slate-50 p-2'>
                    <h2 className='flex justify-center' >No Data</h2>
                </div>
            }
        </div>
    )
}

export default ExpenseListTable
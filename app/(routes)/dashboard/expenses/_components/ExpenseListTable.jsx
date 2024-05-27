import { db } from '@/utils/dbConfig'
import { Expenses } from '@/utils/schema'
import { eq } from 'drizzle-orm'
import { Trash } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'

const ExpenseListTable = ({ expenseList }) => {
    const deleteExpense = async (expense) => {
        const result = await db.delete(Expenses)
            .where(eq(Expenses.id, expense.id))
            .returning()
        if (result) {
            toast('Expense Deleted!')
        }
    }

    return (
        <div className='mt-3'>
            <div className='grid grid-cols-4 bg-slate-200 p-2 font-bold'>
                <h2>Name</h2>
                <h2>Amount</h2>
                <h2>Date</h2>
                <h2>Action</h2>
            </div>
            {expenseList?.map((expenses, index) => (
                <div key={index} className='grid grid-cols-4 bg-slate-50 p-2'>
                    <h2>{expenses.name}</h2>
                    <h2>{expenses.amount}</h2>
                    <h2>{expenses.createdAt}</h2>
                    <h2>
                        <Trash onClick={deleteExpense(expenses)} className='text-red-600 cursor-pointer' />
                    </h2>
                </div>
            ))}
        </div>
    )
}

export default ExpenseListTable
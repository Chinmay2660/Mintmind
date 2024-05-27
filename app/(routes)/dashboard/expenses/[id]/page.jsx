'use client'
// import { useUser } from '@clerk/nextjs'
// import { getTableColumns, eq, sql } from 'drizzle-orm'
// import { Budgets, Expenses } from '@/utils/schema'
// import { db } from '@/utils/dbConfig'
import React, { useEffect } from 'react'
import BudgetItem from '../../budget/_components/BudgetItem'
import AddExpense from '../_components/AddExpense'

const ExpensesComponent = ({ params }) => {

    const [budgetInfo, setBudgetInfo] = useState([])

    // const {user} = useUser()

    // useEffect(() => {
    //     user && getBudgetInfo()
    // }, [user])

    // const getBudgetInfo = async () => {
    //     const result = await db.select({
    //         ...getTableColumns(Budgets),
    //         totalSpend: sql`sum(${Expenses.amount})`.mapWith(Number),
    //         totalItem: sql`count(${Expenses.id})`.mapWith(Number),
    //     }).from(Budgets).leftJoin(Expenses, eq(Budgets.id, Expenses.budgetId))
    //         .where(eq(Budgets.createdBy, user?.primaryEmailAddress?.emailAddress))
    //         .where(eq(Budgets.id, params.id))
    //         .groupBy(Budgets.id)
    //     console.log(result)
    //     setBudgetInfo(result[0])
    // }

    return (
        <div className='p-10'>
            <h2 className='text-2xl font-bold'>My Expenses</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 mt-6 gap-5'>
                {budgetInfo ? <BudgetItem budget={budgetInfo} />
                    : <div className='w-full bg-slate-200 rounded-lg h-[150px] animate-pulse'>

                    </div>}
                    {/* <AddExpense budgetId={params.id} user={user} refreshData={() => getBudgetInfo()}/> */}
            </div>
        </div>
    )
}

export default ExpensesComponent
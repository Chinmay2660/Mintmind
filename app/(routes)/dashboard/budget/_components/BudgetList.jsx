'use client'
import React, { useEffect, useState } from 'react'
import CreateBudget from './CreateBudget'
import BudgetItem from './BudgetItem'
// import { useUser } from '@clerk/nextjs'
// import { getTableColumns, eq, sql } from 'drizzle-orm'
// import { Budgets, Expenses } from '@/utils/schema'
// import { db } from '@/utils/dbConfig'

const BudgetList = () => {
    const [budgetList, setBudgetList] = useState([])

    // const {user} = useUser()

    // useEffect(() => {
    //     user && getBudgetList()
    // }, [user])

    // const getBudgetList = async () => {
    //     const result = await db.select({
    //         ...getTableColumns(Budgets),
    //         totalSpend: sql`sum(${Expenses.amount})`.mapWith(Number),
    //         totalItem: sql`count(${Expenses.id})`.mapWith(Number),
    //     }).from(Budgets).leftJoin(Expenses, eq(Budgets.id, Expenses.budgetId))
    //         .where(eq(Budgets.createdBy, user?.primaryEmailAddress?.emailAddress))
    //         .groupBy(Budgets.id)
    //     console.log(result)
    //     setBudgetList(result)
    // }

    return (
        <div className='mt-7'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
                <CreateBudget />
                {budgetList.map((budget, index) =>{
                    <BudgetItem budget={budget}/>
                })}
            </div>
        </div>
    )
}

export default BudgetList
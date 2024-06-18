'use client'
import React, { Suspense, useEffect, useState } from 'react'
import CreateBudget from './CreateBudget'
import BudgetItem from './BudgetItem'
import { desc } from 'drizzle-orm'
import { useUser } from '@clerk/nextjs'
import { getTableColumns, eq, sql } from 'drizzle-orm'
import { Budgets, Expenses } from '@/utils/schema'
import { db } from '@/utils/dbConfig'

const BudgetList = () => {
    const [budgetList, setBudgetList] = useState([])
    const [isLoading, setIsLoading] = useState(false);

    const { user } = useUser()

    useEffect(() => {
        setIsLoading(true);
        user && getBudgetList()
    }, [user])

    const getBudgetList = async () => {
        const result = await db.select({
            ...getTableColumns(Budgets),
            totalSpend: sql`sum(${Expenses.amount})`.mapWith(Number),
            totalItem: sql`count(${Expenses.id})`.mapWith(Number),
        }).from(Budgets).leftJoin(Expenses, eq(Budgets.id, Expenses.budgetId))
            .where(eq(Budgets.createdBy, user?.primaryEmailAddress?.emailAddress))
            .groupBy(Budgets.id)
            .orderBy(desc(Budgets.id))
        await setBudgetList(result)
        setIsLoading(true);
    }

    return (
        <div className='mt-7'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
                <CreateBudget refreshData={() => getBudgetList()} />
                {budgetList && budgetList?.length > 0 && isLoading ? budgetList.map((budget, index) => (
                    <BudgetItem key={index} budget={budget} />
                )) : [1, 2, 3, 4, 5].map((item, index) => (
                    <div key={index} className='w-full bg-slate-200 rounded-lg h-[170px] animate-pulse'>

                    </div>
                ))}
            </div>
        </div>
    )
}

export default BudgetList
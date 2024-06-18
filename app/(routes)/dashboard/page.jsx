'use client'
import { useUser } from '@clerk/nextjs'
import React, { useEffect, useState } from 'react'
import CardInfo from '../dashboard/_components/CardInfo'
import BarChartDashboard from './_components/BarChartDashboard'
import { db } from '@/utils/dbConfig'
import { desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { Budgets, Expenses } from '@/utils/schema'
import BudgetItem from './budget/_components/BudgetItem'
import ExpenseListTable from './expenses/_components/ExpenseListTable'

const Dashboard = () => {
  const { user } = useUser()
  const [budgetList, setBudgetList] = useState([])
  const [expensesList, setExpensesList] = useState([])

  useEffect(() => {
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
    setBudgetList(result)
    getAllExpenses()
  }

  const getAllExpenses = async () => {
    const result = await db.select({
      id: Expenses.id,
      name: Expenses.name,
      amount: Expenses.amount,
      createdAt: Expenses.createdAt
    }).from(Budgets)
      .rightJoin(Expenses, eq(Budgets.id, Expenses.budgetId))
      .where(eq(Budgets.createdBy, user?.primaryEmailAddress?.emailAddress))
      .orderBy(desc(Expenses.id))
    setExpensesList(result)
  }

  return (
    <div className='p-8'>
      <h2 className='font-bold text-3xl'>Hi, {user?.fullName ?? 'Guest'} ✌️</h2>
      <p className='text-gray-500'>Here&apos;s what&apos;s happening with your money. Let&apos;s manage your expenses.</p>
      <CardInfo budgetList={budgetList} />
      <div className='grid grdi-cols-1 md:grid-cols-3 mt-6 gap-5'>
        <div className='md:col-span-2'>
          <BarChartDashboard budgetList={budgetList} />
          {expensesList?.length > 0 && <ExpenseListTable expenseList={expensesList} refreshData={() => getBudgetList()} />}
        </div>
        <div>
          {budgetList?.length > 0 && (
            <>
              <h2 className="font-bold text-lg">Latest Budgets</h2>
              {budgetList.map((budget, index) => (
                <div key={index} className="mb-4 mt-2">
                  <BudgetItem budget={budget} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
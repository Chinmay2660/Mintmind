'use client'
import { useUser } from '@clerk/nextjs'
import { getTableColumns, eq, sql, desc } from 'drizzle-orm'
import { Budgets, Expenses } from '@/utils/schema'
import { db } from '@/utils/dbConfig'
import React, { useEffect, useState } from 'react'
import BudgetItem from '../../budget/_components/BudgetItem'
import AddExpense from '../_components/AddExpense'
import ExpenseListTable from '../_components/ExpenseListTable'
import EditBudget from '../_components/EditBudget'
import { Button } from '@/components/ui/button'
import { Trash, ArrowLeft } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useRouter } from 'next/navigation'
import { toast } from "sonner"

const ExpensesComponent = ({ params }) => {
    const router = useRouter()
    const [budgetInfo, setBudgetInfo] = useState([])
    const [expensesList, setExpensesList] = useState([])
    const { user } = useUser()

    useEffect(() => {
        user && getBudgetInfo()
    }, [user])

    const getBudgetInfo = async () => {
        const result = await db.select({
            ...getTableColumns(Budgets),
            totalSpend: sql`sum(${Expenses.amount})`.mapWith(Number),
            totalItem: sql`count(${Expenses.id})`.mapWith(Number),
        }).from(Budgets).leftJoin(Expenses, eq(Budgets.id, Expenses.budgetId))
            .where(eq(Budgets.createdBy, user?.primaryEmailAddress?.emailAddress))
            .where(eq(Budgets.id, params.id))
            .groupBy(Budgets.id)
        setBudgetInfo(result[0])
        getExpensesList()
    }

    const getExpensesList = async () => {
        const result = await db.select().from(Expenses)
            .where(eq(Expenses.budgetId, params.id))
            .orderBy(desc(Expenses.id))
        setExpensesList(result)
    }

    const deleteBudget = async () => {
        const deleteExpenseResult = await db.delete(Expenses)
            .where(eq(Expenses.budgetId, params.id))
        if (deleteExpenseResult) {
            const result = await db.delete(Budgets)
                .where(eq(Budgets.id, params.id))
                .returning()
            if (result) {
                router.replace('/dashboard/budget')
                toast.success('Budget Deleted!', {
                    style: {
                        background: 'green',
                        color: 'white'
                    }
                })
            }
        }
    }

    return (
        <div className='p-10'>
            <div className='flex justify-between items-center'>
            <div className='flex items-center gap-2'>
                    <Button variant='ghost' onClick={() => router.back()}><ArrowLeft /></Button>
                    <h2 className='text-2xl font-bold '>My Expenses</h2>
                </div>
                <div className='flex gap-2 items-center'>
                    <EditBudget budgetInfo={budgetInfo} refreshData={() => getBudgetInfo()} />

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant='destructive' className='flex gap-2'><Trash />Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete current budget along with expenses.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className='mr-2'>Cancel</AlertDialogCancel>
                                <AlertDialogAction className='mt-2' onClick={() => deleteBudget()}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 mt-6 gap-5'>
                {budgetInfo ? <BudgetItem budget={budgetInfo} />
                    : <div className='w-full bg-slate-200 rounded-lg h-[150px] animate-pulse'>

                    </div>}
                <AddExpense budgetId={params.id} user={user} refreshData={() => getBudgetInfo()} />
            </div>
            <div className='mt-4'>
                <ExpenseListTable expenseList={expensesList} refreshData={() => getBudgetInfo()} />
            </div>
        </div>
    )
}

export default ExpensesComponent
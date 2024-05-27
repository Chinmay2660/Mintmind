import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/utils/dbConfig'
import { Expenses, Budgets } from '@/utils/schema'
import { toast } from "sonner"

const AddExpense = ({ budgetId, user, refreshData }) => {
    const [name, setName] = useState('')
    const [amount, setAmount] = useState('')

    const addNewExpense = async () => {
        const result = await db.insert(Expenses).values({
            name: name,
            amount: amount,
            budgetId: budgetId,
            createdBy: user?.primaryEmailAddress?.emailAddress
        }).returning({ insertedId: Budgets.id })

        console.log(result)
        if (result) {
            refreshData()
            toast('New Expense Added')
        }
    }

    return (
        <div className='border p-5 rounded-lg'>
            <h2 className='font-bold text-lg'>Add Expense</h2>
            <div className='mt-2'>
                <h2 className='text-black font-medium my-1'>Expense Name</h2>
                <Input placeholder="e.g. Bedroom Decor" onChange={(e) => setName(e.target.value)} />
            </div>
            <div className='mt-2'>
                <h2 className='text-black font-medium my-1'>Expense Amount</h2>
                <Input type="number" placeholder="e.g. 1000" onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Button onClick={addNewExpense} disabled={!name && !amount} className='mt-3 w-full'>Add New Expense</Button>
        </div>
    )
}

export default AddExpense
'use client'
import React, { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import EmojiPicker from 'emoji-picker-react'
import { DialogClose } from '@radix-ui/react-dialog'
import { PenBox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from "@/components/ui/input"
import { db } from '@/utils/dbConfig'
import { Budgets } from '@/utils/schema'
import { eq } from 'drizzle-orm'
import { toast } from 'sonner'

const EditBudget = ({ budgetInfo, refreshData }) => {
    const [emojiIcon, setEmojiIcon] = useState(budgetInfo?.icon)
    const [openEmojiPicker, setOpenEmojiPicker] = useState(false)
    const [name, setName] = useState()
    const [amount, setAmount] = useState()

    useEffect(() => {
        if (budgetInfo) {
            setEmojiIcon(budgetInfo?.icon)
            setName(budgetInfo?.name)
            setAmount(budgetInfo?.amount)
        }
    }, [budgetInfo])

    const onUpdateBudget = async () => {
        const result = await db.update(Budgets).set({
            name: name,
            amount: amount,
            icon: emojiIcon
        }).where(eq(Budgets.id, budgetInfo.id))
            .returning()
        if (result) {
            refreshData()
            toast.success('Budget Updated!', {
                style: {
                    background: 'green',
                    color: 'white'
                }
            })
        }
    }

    return (
        <div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button className='flex gap-2'><PenBox />Edit</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Budget</DialogTitle>
                        <DialogDescription>
                            <div className='mt-5'>
                                <Button className='text-lg' variant='outlined' onClick={() => setOpenEmojiPicker(true)}>{emojiIcon}</Button>
                                <div className='absolute z-20'>
                                    <EmojiPicker open={openEmojiPicker} defaultValue={budgetInfo?.icon} onEmojiClick={(e) => {
                                        setEmojiIcon(e.emoji)
                                        setOpenEmojiPicker(false)
                                    }} />
                                </div>
                                <div className='mt-2'>
                                    <h2 className='text-black font-medium my-1'>Budget Name </h2>
                                    <Input defaultValue={budgetInfo?.name} placeholder="e.g. Home Decor" onChange={(e) => setName(e.target.value)} />
                                </div>
                                <div className='mt-2'>
                                    <h2 className='text-black font-medium my-1'>Budget Amount </h2>
                                    <Input defaultValue={budgetInfo?.amount} type="number" placeholder="e.g. 1000" onChange={(e) => setAmount(e.target.value)} />
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-start">
                        <DialogClose asChild>
                            <Button disabled={!(name && amount)} className='mt-5 w-full' onClick={() => onUpdateBudget()}>Update Budget</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default EditBudget
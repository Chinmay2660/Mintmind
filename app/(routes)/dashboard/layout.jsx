'use client'
import React, { useEffect } from 'react'
import SideNavbar from './_components/SideNavbar'
import DashboardHeader from './_components/DashboardHeader'
import { useRouter } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { useUser } from '@clerk/nextjs'
import { db } from '@/utils/dbConfig'
import { Budgets } from '@/utils/schema'

const DashboardLayout = ({ children }) => {
    const { user } = useUser()
    const router = useRouter()

    useEffect(() => {
        user && checkUserBudget()
    }, [user])

    const checkUserBudget = async () => {
        const result = await db.select()
            .from(Budgets)
            .where(eq(Budgets.createdBy, user?.primaryEmailAddress?.emailAddress))
        console.log(result)
        if (result.length === 0) {
            router.replace('/dashboard/budget')
        }
    }

    return (
        <div>
            <div className='fixed md:w-64 hidden md:block shadow-sm border'>
                <SideNavbar />
            </div>
            <div className='md:ml-64'>
                <DashboardHeader />
                {children}
            </div>
        </div>
    )
}

export default DashboardLayout
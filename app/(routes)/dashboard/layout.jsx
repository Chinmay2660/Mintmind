'use client'
import React from 'react'
import MobileNavbar from './_components/MobileNavbar'
import DashboardHeader from './_components/DashboardHeader'
import NativeLayout from './_components/NativeLayout'
import { isNativePlatform } from '@/lib/platform'

const DashboardLayout = ({ children }) => {
    const isNative = typeof window !== 'undefined' && isNativePlatform()

    // Native app layout (full screen, no desktop sidebar)
    if (isNative) {
        return (
            <NativeLayout>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                    <DashboardHeader />
                    <main className="min-h-screen pb-20">
                        {children}
                    </main>
                    <MobileNavbar />
                </div>
            </NativeLayout>
        )
    }

    // Web layout (with desktop sidebar)
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <MobileNavbar />
            <div className="md:ml-64">
                <DashboardHeader />
                <main className="min-h-screen pb-20 md:pb-0">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
'use client'
import React from 'react'
import MobileNavbar from './_components/MobileNavbar'
import DashboardHeader from './_components/DashboardHeader'
import NativeLayout from './_components/NativeLayout'
import PageTitle from './_components/PageTitle'
import OfflineIndicator from '@/components/OfflineIndicator'
import LiquidBackground from '@/app/_components/LiquidBackground'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { isNativePlatform } from '@/lib/platform'

const shellClass = 'finance-shell'

const DashboardLayout = ({ children }) => {
    const isNative = typeof window !== 'undefined' && isNativePlatform()

    return (
        <SidebarProvider>
            {isNative ? (
                <NativeLayout>
                    <div className={shellClass}>
                        <LiquidBackground className="opacity-50" />
                        <div className="relative z-10">
                            <PageTitle />
                            <OfflineIndicator />
                            <DashboardHeader />
                            <main className="min-h-screen pb-20">
                                {children}
                            </main>
                            <MobileNavbar />
                        </div>
                    </div>
                </NativeLayout>
            ) : (
                <div className={shellClass}>
                    <LiquidBackground className="opacity-40" />
                    <div className="relative z-10 flex min-h-screen">
                        <PageTitle />
                        <OfflineIndicator />
                        <MobileNavbar />
                        <div className="flex min-w-0 flex-1 flex-col">
                            <DashboardHeader />
                            <main className="min-h-screen flex-1 pb-20 md:pb-0">
                                {children}
                            </main>
                        </div>
                    </div>
                </div>
            )}
        </SidebarProvider>
    )
}

export default DashboardLayout

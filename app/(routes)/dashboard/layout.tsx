'use client'
import React, { useEffect, useState } from 'react'
import MobileBottomNav from './_components/MobileNavbar'
import DashboardHeader from './_components/DashboardHeader'
import NativeLayout from './_components/NativeLayout'
import PageTitle from './_components/PageTitle'
import OfflineIndicator from '@/components/OfflineIndicator'
import AppSearch from '@/components/AppSearch'
import { AppSearchProvider } from '@/contexts/AppSearchContext'
import { isNativePlatform } from '@/lib/platform'
import { DashboardRefreshShell } from './_components/DashboardRefreshShell'
import { DashboardShell } from './_components/DashboardShell'

const shellClass = 'finance-shell aurora-bg'

function DashboardPageContent({ children }: { children: React.ReactNode }) {
    return (
        <>
            <PageTitle />
            <OfflineIndicator />
            <DashboardHeader />
            <DashboardRefreshShell>
                <main className="flex-1 mobile-content-pb md:pb-0">{children}</main>
            </DashboardRefreshShell>
        </>
    )
}

const DashboardLayout = ({ children }) => {
    const [isNative, setIsNative] = useState(false)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        setIsNative(isNativePlatform())
        setReady(true)
    }, [])

    return (
        <AppSearchProvider>
            {!ready ? (
                <div className={shellClass} aria-hidden />
            ) : isNative ? (
                <NativeLayout>
                    <div className={shellClass}>
                        <div className="relative z-10">
                            <PageTitle />
                            <OfflineIndicator />
                            <DashboardHeader />
                            <DashboardRefreshShell>
                                <main className="min-h-screen mobile-content-pb">
                                    {children}
                                </main>
                            </DashboardRefreshShell>
                            <MobileBottomNav />
                        </div>
                    </div>
                </NativeLayout>
            ) : (
                <div className={shellClass}>
                    <DashboardShell>
                        <DashboardPageContent>{children}</DashboardPageContent>
                    </DashboardShell>
                </div>
            )}
            <AppSearch />
        </AppSearchProvider>
    )
}

export default DashboardLayout

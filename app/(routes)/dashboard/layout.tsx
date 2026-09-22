'use client'
import React, { useEffect, useState } from 'react'
import MobileBottomNav from './_components/MobileNavbar'
import DashboardHeader from './_components/DashboardHeader'
import NativeLayout from './_components/NativeLayout'
import PageTitle from './_components/PageTitle'
import AppSearch from '@/components/AppSearch'
import { AppSearchProvider } from '@/contexts/AppSearchContext'
import { isNativePlatform } from '@/lib/platform'
import { DashboardRefreshShell } from './_components/DashboardRefreshShell'
import { DashboardShell } from './_components/DashboardShell'
import { DashboardPage } from '@/components/ui/dashboard-page'
import { DemoDataModalProvider } from './_components/DemoDataModal'

const shellClass = 'finance-shell aurora-bg fixed inset-0 flex h-svh flex-col overflow-hidden'

function DashboardPageContent({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid h-full min-h-0 grid-rows-[auto_1fr] overflow-hidden">
            <PageTitle />
            <div className="row-start-1">
                <DashboardHeader />
            </div>
            <DashboardRefreshShell className="row-start-2 min-h-0 overflow-hidden">
                <main
                    id="dashboard-main-scroll"
                    className="h-full min-h-0 overflow-y-auto overscroll-y-contain mobile-content-pb md:pb-0"
                >
                    <DashboardPage>{children}</DashboardPage>
                </main>
            </DashboardRefreshShell>
        </div>
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
            <DemoDataModalProvider>
            {!ready ? (
                <div className={shellClass} />
            ) : isNative ? (
                <NativeLayout>
                    <div className={shellClass}>
                        <div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_1fr] overflow-hidden">
                            <PageTitle />
                            <div className="row-start-1">
                                <DashboardHeader />
                            </div>
                            <DashboardRefreshShell className="row-start-2 min-h-0 overflow-hidden">
                                <main
                                    id="dashboard-main-scroll"
                                    className="h-full min-h-0 overflow-y-auto overscroll-y-contain mobile-content-pb"
                                >
                                    <DashboardPage>{children}</DashboardPage>
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
            </DemoDataModalProvider>
        </AppSearchProvider>
    )
}

export default DashboardLayout

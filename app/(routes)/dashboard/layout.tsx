'use client'
import React, { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import MobileNavbar from './_components/MobileNavbar'
import DashboardHeader from './_components/DashboardHeader'
import NativeLayout from './_components/NativeLayout'
import PageTitle from './_components/PageTitle'
import OfflineIndicator from '@/components/OfflineIndicator'
import AppSearch from '@/components/AppSearch'
import { AppSearchProvider } from '@/contexts/AppSearchContext'
import { isNativePlatform } from '@/lib/platform'
import { scrollPageToTop } from '@/lib/utils/scroll'
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
    const pathname = usePathname()
    const isFirstRender = useRef(true)
    const [isNative, setIsNative] = useState(false)

    useEffect(() => {
        setIsNative(isNativePlatform())
    }, [])

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        scrollPageToTop()
    }, [pathname])

    return (
        <AppSearchProvider>
            {isNative ? (
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
                            <MobileNavbar />
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

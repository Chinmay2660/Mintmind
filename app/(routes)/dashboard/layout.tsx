'use client'
import React, { useEffect, useRef } from 'react'
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

const shellClass = 'finance-shell aurora-bg'

function DashboardMain({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-w-0 flex-1 flex flex-col">
            <PageTitle />
            <OfflineIndicator />
            <DashboardHeader />
            <main className="min-h-screen mobile-content-pb md:pb-0">{children}</main>
        </div>
    )
}

const DashboardLayout = ({ children }) => {
    const pathname = usePathname()
    const isFirstRender = useRef(true)
    const isNative = typeof window !== 'undefined' && isNativePlatform()

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
                            <main className="min-h-screen mobile-content-pb">
                                {children}
                            </main>
                            <MobileNavbar />
                        </div>
                    </div>
                </NativeLayout>
            ) : (
                <div className={shellClass}>
                    <div className="relative z-10 flex min-h-screen">
                        <MobileNavbar />
                        <DashboardMain>{children}</DashboardMain>
                    </div>
                </div>
            )}
            <AppSearch />
        </AppSearchProvider>
    )
}

export default DashboardLayout

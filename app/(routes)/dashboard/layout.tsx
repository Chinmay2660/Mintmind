'use client'
import React from 'react'
import AppSearch from '@/components/AppSearch'
import { MainScroll } from '@/components/shell/MainScroll'
import { AppSearchProvider } from '@/contexts/AppSearchContext'
import { WealthProvider } from '@/lib/wealth/WealthContext'
import { FeaturesProvider } from '@/lib/features/FeaturesContext'
import { FeatureGuard } from '@/components/shell/FeatureGuard'
import { Sidebar } from '@/components/shell/Sidebar'
import { TopBar } from '@/components/shell/TopBar'
import { MobileNav } from '@/components/shell/MobileNav'
import PageTitle from './_components/PageTitle'
import { AssistantProvider } from '@/components/ai/AssistantProvider'
import { PriceRefresher } from '@/components/shell/PriceRefresher'
import { DeviceNotifier } from '@/components/shell/DeviceNotifier'
import { AutomationRunner } from '@/components/ai/AutomationRunner'

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <AppSearchProvider>
            <WealthProvider>
                <FeaturesProvider>
                <AssistantProvider>
                <AutomationRunner />
                <DeviceNotifier />
                <PriceRefresher />
                <div className="app-shell fixed inset-0 flex bg-background text-foreground">
                    <Sidebar />
                    <div className="flex min-w-0 flex-1 flex-col">
                        <PageTitle />
                        <TopBar />
                        <MainScroll><FeatureGuard>{children}</FeatureGuard></MainScroll>
                    </div>
                    <MobileNav />
                </div>
                </AssistantProvider>
                <AppSearch />
                </FeaturesProvider>
            </WealthProvider>
        </AppSearchProvider>
    )
}

export default DashboardLayout

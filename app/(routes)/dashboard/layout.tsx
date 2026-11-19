'use client'
import React from 'react'
import AppSearch from '@/components/AppSearch'
import { MainScroll } from '@/components/shell/MainScroll'
import dynamic from 'next/dynamic'
import { Shortcuts } from '@/components/shell/Shortcuts'

const ProductTour = dynamic(() => import('@/components/shell/ProductTour').then((m) => m.ProductTour), { ssr: false })
import { DetailCrumbProvider } from '@/components/shell/DetailCrumb'
import { EdgeSwipeBack } from '@/components/shell/EdgeSwipeBack'
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
                <ProductTour />
                <Shortcuts />
                <DeviceNotifier />
                <PriceRefresher />
                <DetailCrumbProvider>
                <EdgeSwipeBack />
                <a href="#dashboard-main-scroll" className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a>
                <div className="app-shell fixed inset-0 flex bg-background text-foreground">
                    <Sidebar />
                    <div className="flex min-w-0 flex-1 flex-col">
                        <PageTitle />
                        <TopBar />
                        <MainScroll><FeatureGuard>{children}</FeatureGuard></MainScroll>
                    </div>
                    <MobileNav />
                </div>
                </DetailCrumbProvider>
                </AssistantProvider>
                <AppSearch />
                </FeaturesProvider>
            </WealthProvider>
        </AppSearchProvider>
    )
}

export default DashboardLayout

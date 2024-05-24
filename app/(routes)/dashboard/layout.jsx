import React from 'react'
import SideNavbar from './_components/SideNavbar'
import DashboardHeader from './_components/DashboardHeader'

const DashboardLayout = ({ children }) => {
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
import React from 'react'
import SideNavbar from './_components/SideNavbar'

const DashboardLayout = ({ children }) => {
    return (
        <div>
            <div className='fixed md:w-64 hidden md:block shadow-sm border'>
                <SideNavbar />
            </div>
            <div className='md:ml-64 bg-green-300'>
                {children}
            </div>
        </div>
    )
}

export default DashboardLayout
'use client'
import Image from 'next/image';
import React from 'react';
import { Landmark, LayoutDashboard, PiggyBank, ReceiptText, ShieldCheck, Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import UserProfile from '@/components/UserProfile';

const SideNavbar = () => {
    const menuList = [
        {
            id: 1,
            name: 'Dashboard',
            icon: <LayoutDashboard />,
            path: '/dashboard'
        },
        {
            id: 2,
            name: 'Budgets',
            icon: <PiggyBank />,
            path: '/dashboard/budget'
        },
        // {
        //     id: 3,
        //     name: 'Bank Accounts',
        //     icon: <Landmark />,
        //     path: '/dashboard/bank_accounts'
        // },
        {
            id: 4,
            name: 'Expenses',
            icon: <ReceiptText />,
            path: '/dashboard/expenseList'
        },
        {
            id: 5,
            name: 'Family',
            icon: <Users />,
            path: '/dashboard/family'
        },
        // {
        //     id: 5,
        //     name: 'Upgrade',
        //     icon: <ShieldCheck />,
        //     path: '/dashboard/upgrade'
        // }
    ];

    const path = usePathname();

    return (
        <div className='h-screen p-5 relative flex flex-col'>
            <div className='mb-8'>
                <Link href="/">
                    <Image src='/logo.svg' alt='logo' width={160} height={100} className="cursor-pointer" />
                </Link>
            </div>
            <div className='mt-5 flex-1'>
                {menuList.map(menu => (
                    <Link key={menu.id} href={menu.path}>
                        <div
                            className={`flex gap-2 items-center text-gray-500 font-medium p-5 cursor-pointer hover:rounded-md hover:text-primary hover:bg-blue-100 ${path === menu.path ? 'text-primary bg-blue-100' : ''}`}
                        >
                            <div className='mr-3'>{menu.icon}</div>
                            <h2 className='text-lg'>{menu.name}</h2>
                        </div>
                    </Link>
                ))}
            </div>
            <div className='mt-auto p-4 -mx-5 -mb-5 flex gap-2 items-center bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800'>
                <UserProfile />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile</span>
            </div>
        </div>
    );
}

export default SideNavbar;

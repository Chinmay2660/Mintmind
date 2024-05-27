'use client'
import Image from 'next/image';
import React from 'react';
import { Landmark, LayoutDashboard, PiggyBank, ReceiptText, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

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
        {
            id: 3,
            name: 'Bank Accounts',
            icon: <Landmark />,
            path: '/dashboard/bank_accounts'
        },
        {
            id: 4,
            name: 'Expenses',
            icon: <ReceiptText />,
            path: '/dashboard/expenses'
        },
        {
            id: 5,
            name: 'Upgrade',
            icon: <ShieldCheck />,
            path: '/dashboard/upgrade'
        }
    ];

    const path = usePathname();

    return (
        <div className='h-screen p-5'>
            <div className='mb-8'>
                <Image src='/logo.svg' alt='logo' width={160} height={100} />
            </div>
            <div className='mt-5'>
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
            <div className='fixed bottom-2 p-5 flex gap-2 items-center'>
                <UserButton />
                <h2>Profile</h2>
            </div>
        </div>
    );
}

export default SideNavbar;

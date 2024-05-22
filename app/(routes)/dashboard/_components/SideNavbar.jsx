import Image from 'next/image';
import React from 'react';
import { Landmark, LayoutDashboard, PiggyBank, ReceiptText, ShieldCheck } from 'lucide-react';

const SideNavbar = () => {
    const menuList = [
        {
            id: 1,
            name: 'Dashboard',
            icon: <LayoutDashboard />
        },
        {
            id: 2,
            name: 'Budgets',
            icon: <PiggyBank />
        },
        {
            id: 3,
            name: 'Bank Accounts',
            icon: <Landmark />
        },
        {
            id: 4,
            name: 'Expenses',
            icon: <ReceiptText />
        },
        {
            id: 5,
            name: 'Upgrade',
            icon: <ShieldCheck />
        }
    ];

    return (
        <div className='h-screen p-5'>
            <div className='mb-8'>
                <Image src='/logo.svg' alt='logo' width={160} height={100} />
            </div>
            <div className='mt-5'>
                {menuList.map(menu => (
                    <h2 key={menu.id} className='flex gap-2 items-center text-gray-500 font-medium p-5 cursor-pointer hover:rounded-md hover:text-primary hover:bg-blue-100'>
                        <div className='mr-3'>{menu.icon}</div>
                        <h2 className='text-lg'>{menu.name}</h2>
                    </h2>
                ))}
            </div>
            <div className='fixed bottom-2 p-5 flex gap-2 items-center'>
                <h2>Profile</h2>
            </div>
        </div>
    );
}

export default SideNavbar;

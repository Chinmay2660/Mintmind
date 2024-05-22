import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const Header = () => {
    return (
        <div className='p-5 flex justify-between items-center border shadow-sm'>
            <Image src={'/logo.svg'} alt='logo' width={160} height={100} />
            <Link href={'/dashboard'}>
                <Button>Get Started</Button>
            </Link>
        </div>
    )
}

export default Header
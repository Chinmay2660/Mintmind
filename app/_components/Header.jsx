'use client'
import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
// import { useUser, UserButton} from '@clerk/nextjs'

const Header = () => {

    // const {user, isSignedIn} = useUser()
    return (
        <div className='p-5 flex justify-between items-center border shadow-sm'>
            <Image src={'/logo.svg'} alt='logo' width={160} height={100} />
            {/* {isSignedIn ?
                <UserButton /> :
                <Link href={'/dashboard'}>
                    <Button>Get Started</Button>
                </Link>
            } */}
        </div>
    )
}

export default Header
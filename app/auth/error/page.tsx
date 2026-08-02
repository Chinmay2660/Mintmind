'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import Logo from '@/components/Logo'
import { useEffect, useState, Suspense } from 'react'

const errorMessages = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'Something went wrong during authentication. Please try again.',
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('Default')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
      setErrorMessage(errorMessages[errorParam] || errorMessages.Default)
    } else {
      setErrorMessage(errorMessages.Default)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center landing-bg aurora-bg text-foreground p-4 relative overflow-hidden">

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="surface-card p-8 sm:p-10 space-y-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 dark:bg-red-500/10 rounded-full animate-ping"></div>
              <div className="relative bg-red-100 dark:bg-red-900/30 p-5 rounded-full">
                <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h1 className="text-3xl font-bold text-foreground">
              Authentication Error
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              {errorMessage}
            </p>
            {error !== 'Default' && (
              <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-2">
                Error code: {error}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3 pt-2"
          >
            <Link href="/auth/signin" className="block">
              <Button className="w-full h-12 text-base font-medium rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
                Try Again
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full h-12 text-base font-medium rounded-xl">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-4"
          >
            <div className="flex justify-center">
              <Logo />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center landing-bg text-foreground">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}

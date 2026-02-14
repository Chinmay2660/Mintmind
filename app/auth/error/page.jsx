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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950 p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-100 dark:bg-red-900/10 rounded-full blur-3xl animate-blob mix-blend-multiply dark:mix-blend-normal filter opacity-30 dark:opacity-20"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-100 dark:bg-primary-900/20 rounded-full blur-3xl animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-normal filter opacity-40 dark:opacity-30"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl p-8 sm:p-10 space-y-6 text-center border border-gray-200 dark:border-gray-700">
          {/* Error Icon */}
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

          {/* Error Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Authentication Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
              {errorMessage}
            </p>
            {error !== 'Default' && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Error code: {error}
              </p>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3 pt-2"
          >
            <Link href="/auth/signin" className="block">
              <Button className="w-full h-12 text-base font-medium bg-primary hover:bg-primary-700 text-white shadow-md transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2 rotate-180" />
                Try Again
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button 
                variant="outline" 
                className="w-full h-12 text-base font-medium border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </motion.div>

          {/* Logo at bottom */}
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}


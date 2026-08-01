'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, BarChart3, Shield, ArrowRight, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

const onboardingSteps = [
  {
    id: 1,
    title: 'Track Your Finances',
    description: 'Monitor all your bank accounts, cash, and investments in one place',
    icon: Wallet,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 2,
    title: 'Smart Investments',
    description: 'Track FDs, Mutual Funds, and Stocks with maturity dates',
    icon: TrendingUp,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    id: 3,
    title: 'Visual Analytics',
    description: 'Get insights with beautiful charts and reports',
    icon: BarChart3,
    color: 'from-primary to-primary/80',
  },
  {
    id: 4,
    title: 'Secure & Private',
    description: 'Your financial data is encrypted and secure',
    icon: Shield,
    color: 'from-blue-500 to-blue-600',
  },
]

export default function NativeOnboarding({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete?.()
      router.push('/auth/signin')
    }
  }

  const handleSkip = () => {
    onComplete?.()
    router.push('/auth/signin')
  }

  const current = onboardingSteps[currentStep]
  const Icon = current.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex flex-col">
      {/* Progress Indicator */}
      <div className="pt-12 px-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleSkip}
            className="text-white/60 text-sm font-medium"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-white w-8'
                    : index < currentStep
                    ? 'bg-white/50 w-2'
                    : 'bg-white/20 w-2'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-8 max-w-sm"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-2xl`}
            >
              <Icon className="w-12 h-12 text-white" />
            </motion.div>

            {/* Text */}
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-white"
              >
                {current.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/70 text-lg leading-relaxed"
              >
                {current.description}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      <div className="px-6 pb-8 space-y-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          className="w-full h-14 bg-white text-foreground rounded-2xl font-semibold text-lg shadow-lg flex items-center justify-center gap-2"
        >
          {currentStep === onboardingSteps.length - 1 ? (
            <>
              <span>Get Started</span>
              <Check className="w-5 h-5" />
            </>
          ) : (
            <>
              <span>Next</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>

        {currentStep < onboardingSteps.length - 1 && (
          <button
            onClick={handleSkip}
            className="w-full text-white/60 text-sm font-medium"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}


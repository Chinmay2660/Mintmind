'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Wallet, TrendingUp, PieChart, Shield, ArrowRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'

const Hero = () => {
    const stats = [
        { value: "10K+", label: "Active Users" },
        { value: "50K+", label: "Transactions Tracked" },
        { value: "95%", label: "User Satisfaction" }
    ]

    const features = [
        "Free forever",
        "No credit card",
        "30s setup"
    ]

    return (
        <section className='relative bg-white dark:bg-gray-900 overflow-hidden'>
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 dark:bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative mx-auto max-w-screen-xl px-4 py-12 sm:py-16 lg:py-24">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-sm font-medium mb-6"
                        >
                            <Check className="w-4 h-4" />
                            <span>Free forever • No credit card</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6"
                        >
                            Track Every
                            <span className="block gradient-text mt-2">Financial Move</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed"
                        >
                            The modern finance companion. Track expenses, manage accounts, monitor investments, and analyze your financial progress - all in one place.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 mb-8"
                        >
                            <Link href="/auth/signin">
                                <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 hover-lift gradient-bg-blue border-0 text-white shadow-lg group">
                                    Start Free Today
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <Link href="/dashboard">
                                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 hover-lift border-2 dark:border-gray-700">
                                    View Dashboard
                                </Button>
                            </Link>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400"
                        >
                            {features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-primary" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right Content - Stats & Preview */}
                    <div className="space-y-8">
                        {/* Statistics Banner */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="grid grid-cols-3 gap-4"
                        >
                            {stats.map((stat, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                                    className={`p-6 rounded-xl text-center ${
                                        idx === 0 ? 'gradient-bg-blue' :
                                        idx === 1 ? 'gradient-bg-teal' :
                                        'gradient-bg-green'
                                    } text-white shadow-lg`}
                                >
                                    <div className="text-3xl font-bold mb-1">{stat.value}</div>
                                    <div className="text-sm opacity-90">{stat.label}</div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Dashboard Preview */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="relative"
                        >
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden bg-white dark:bg-gray-800 hover-lift">
                                <div className="p-2 bg-gray-100 dark:bg-gray-900 flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <Image 
                                    src={'/dashboard2.png'} 
                                    alt='Mintmind Dashboard Preview' 
                                    width={1200} 
                                    height={800} 
                                    className='w-full h-auto'
                                    priority
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Hero

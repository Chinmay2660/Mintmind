'use client'
import React from 'react'
import { DollarSign, Target, BarChart3, CreditCard, PiggyBank, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

const CTA = () => {
    const features = [
        {
            icon: <DollarSign className="w-6 h-6" />,
            title: "Track Expenses",
            description: "Categorize and monitor all your expenses with detailed insights and analytics."
        },
        {
            icon: <CreditCard className="w-6 h-6" />,
            title: "Multiple Accounts",
            description: "Manage multiple bank accounts and cash balances in one place."
        },
        {
            icon: <TrendingUp className="w-6 h-6" />,
            title: "Investment Portfolio",
            description: "Track FDs, Mutual Funds, and Stocks with maturity dates and returns."
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: "Visual Analytics",
            description: "Beautiful charts and graphs to understand your spending patterns."
        },
        {
            icon: <Target className="w-6 h-6" />,
            title: "Budget Planning",
            description: "Set budgets for different categories and track your progress."
        },
        {
            icon: <PiggyBank className="w-6 h-6" />,
            title: "Save Money",
            description: "Identify areas to cut costs and increase your savings effectively."
        }
    ]

    return (
        <section className="bg-white dark:bg-gray-900 py-16 sm:py-20">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything You Need to Manage Your Finances</h2>
                    <p className="mt-4 text-lg text-gray-600">
                        Powerful features designed to help you take control of your money and achieve your financial goals.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover-lift group"
                        >
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    className="rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-3 w-fit mb-4 text-primary group-hover:from-primary/30 group-hover:to-accent/30 transition-colors"
                                >
                                {feature.icon}
                            </motion.div>
                            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors text-gray-900 dark:text-white">{feature.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mt-16 text-center"
                >
                    <div className="rounded-2xl gradient-bg p-8 sm:p-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="relative z-10">
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="text-2xl sm:text-3xl font-bold text-white mb-4"
                            >
                                Ready to Take Control of Your Finances?
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="text-white/90 mb-6 max-w-2xl mx-auto"
                            >
                                Join thousands of users who are already managing their money better with Mintmind.
                            </motion.p>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: 0.4 }}
                            >
                                <Link href="/auth/signin">
                                    <Button size="lg" variant="secondary" className="text-base px-8 py-6 hover-lift bg-white dark:bg-gray-800 text-primary hover:bg-gray-100 dark:hover:bg-gray-700">
                                        Start Free Today
                                    </Button>
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default CTA

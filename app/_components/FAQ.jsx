'use client'
import React, { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null) // Start with all closed

    const faqs = [
        {
            question: "What is Mintmind?",
            answer: "Mintmind is a comprehensive personal finance management application that helps you track expenses, manage multiple bank accounts, monitor investments, and achieve your financial goals. It's designed to give you complete control over your money with beautiful visualizations and insights."
        },
        {
            question: "Is Mintmind free to use?",
            answer: "Yes! Mintmind is completely free to use. You can track unlimited expenses, manage multiple accounts, and monitor your investments without any cost. We believe financial management should be accessible to everyone."
        },
        {
            question: "How secure is my financial data?",
            answer: "Your data security is our top priority. We use industry-standard encryption to protect your information. All data is stored securely, and we never share your financial information with third parties. You can also sign in securely using Google OAuth."
        },
        {
            question: "Can I track multiple bank accounts?",
            answer: "Absolutely! Mintmind allows you to add and manage multiple bank accounts, as well as track cash transactions. You can see all your accounts in one place and get a complete picture of your financial situation."
        },
        {
            question: "What types of investments can I track?",
            answer: "You can track various types of investments including Fixed Deposits (FDs), Mutual Funds, and Stocks. For each investment, you can record the amount invested, date, and maturity type (like payout, reinvestment, etc.)."
        },
        {
            question: "How do I categorize my expenses?",
            answer: "Mintmind allows you to create custom expense and income categories. You can organize your transactions by categories like Food, Transportation, Entertainment, Salary, Freelance, etc. This helps you understand where your money is going."
        },
        {
            question: "Can I access Mintmind on my mobile device?",
            answer: "Yes! Mintmind is a Progressive Web App (PWA) that works perfectly on mobile devices. You can install it on your iPhone or Android device and access it like a native app. The interface is designed mobile-first for the best experience."
        },
        {
            question: "How do I get started?",
            answer: "Getting started is easy! Simply click 'Get Started' and sign in with your Google account. Once you're in, you can start adding your bank accounts, setting up categories, and tracking your first transaction. It takes just a few minutes to set up."
        },
        {
            question: "Can I export my financial data?",
            answer: "Currently, all your data is stored securely in the cloud and accessible through the dashboard. We're working on adding export features so you can download your data in various formats like CSV or PDF for your records."
        },
        {
            question: "What if I have questions or need help?",
            answer: "If you have any questions or need assistance, you can reach out through our support channels. We're constantly improving Mintmind based on user feedback, so your input is valuable to us!"
        }
    ]

    return (
        <section className="bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 py-20 sm:py-24">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <HelpCircle className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Frequently Asked <span className="gradient-text">Questions</span>
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Everything you need to know about Mintmind and how it can help you manage your finances better.
                    </p>
                </motion.div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="group"
                        >
                            <div
                                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span className="font-semibold text-gray-900 dark:text-white pr-8">
                                        {faq.question}
                                    </span>
                                    <motion.div
                                        animate={{ rotate: openIndex === index ? 180 : 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex-shrink-0"
                                    >
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    </motion.div>
                                </button>
                                <AnimatePresence>
                                    {openIndex === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-5 pt-0">
                                                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-12 text-center"
                >
                    <p className="text-gray-600 mb-4">
                        Still have questions?
                    </p>
                    <a
                        href="mailto:support@mintmind.com"
                        className="inline-flex items-center text-primary font-semibold hover:underline"
                    >
                        Contact our support team
                    </a>
                </motion.div>
            </div>
        </section>
    )
}

export default FAQ


'use client'
import React from 'react'
import { Wallet } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Logo({ className = "" }) {
    return (
        <motion.div
            className={`flex items-center gap-2 ${className}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <motion.div
                className="relative"
                animate={{
                    rotate: [0, 5, -5, 0],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 2,
                }}
            >
                <div className="w-10 h-10 rounded-xl gradient-bg-blue flex items-center justify-center shadow-lg">
                    <Wallet className="w-6 h-6 text-white" />
                </div>
                <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white dark:border-gray-900"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.8, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                    }}
                />
            </motion.div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-green-600 bg-clip-text text-transparent">
                Mintmind
            </span>
        </motion.div>
    )
}


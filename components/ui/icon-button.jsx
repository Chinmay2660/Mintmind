'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function IconButton({ 
  icon: Icon, 
  onClick, 
  variant = 'default',
  className = '',
  ...props 
}) {
  const variants = {
    default: 'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400',
    destructive: 'p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400',
    primary: 'p-2 rounded-lg hover:bg-primary/10 text-primary',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(variants[variant], className)}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
    </motion.button>
  )
}

export function EditButton({ onClick, className = '' }) {
  return (
    <IconButton
      icon={require('lucide-react').Edit}
      onClick={onClick}
      variant="default"
      className={className}
    />
  )
}

export function DeleteButton({ onClick, className = '' }) {
  return (
    <IconButton
      icon={require('lucide-react').Trash2}
      onClick={onClick}
      variant="destructive"
      className={className}
    />
  )
}


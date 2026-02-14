import mongoose from 'mongoose'

const RecurringExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'custom'],
      required: true,
      default: 'monthly',
    },
    // For custom frequency
    customDays: {
      type: Number,
      default: null, // e.g., 15 for every 15 days
    },
    // Day of week (0-6, Sunday = 0) for weekly
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      default: null,
    },
    // Day of month (1-31) for monthly/quarterly
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null, // null means ongoing
    },
    nextDueDate: {
      type: Date,
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      default: null,
    },
    isCash: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
    autoCreateTransaction: {
      type: Boolean,
      default: false, // If true, automatically create transactions when due
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
RecurringExpenseSchema.index({ userId: 1, isActive: 1 })
RecurringExpenseSchema.index({ userId: 1, nextDueDate: 1 })
RecurringExpenseSchema.index({ userId: 1, frequency: 1 })

// Method to calculate next due date
RecurringExpenseSchema.methods.calculateNextDueDate = function (fromDate = new Date()) {
  const nextDate = new Date(fromDate)
  
  switch (this.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case 'weekly':
      if (this.dayOfWeek !== null) {
        const daysUntil = (this.dayOfWeek - nextDate.getDay() + 7) % 7
        nextDate.setDate(nextDate.getDate() + (daysUntil || 7))
      } else {
        nextDate.setDate(nextDate.getDate() + 7)
      }
      break
    case 'monthly':
      if (this.dayOfMonth) {
        nextDate.setDate(this.dayOfMonth)
        if (nextDate <= fromDate) {
          nextDate.setMonth(nextDate.getMonth() + 1)
        }
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
      break
    case 'quarterly':
      if (this.dayOfMonth) {
        nextDate.setDate(this.dayOfMonth)
        if (nextDate <= fromDate) {
          nextDate.setMonth(nextDate.getMonth() + 3)
        } else {
          nextDate.setMonth(nextDate.getMonth() + 3)
        }
      } else {
        nextDate.setMonth(nextDate.getMonth() + 3)
      }
      break
    case 'custom':
      if (this.customDays) {
        nextDate.setDate(nextDate.getDate() + this.customDays)
      }
      break
  }
  
  return nextDate
}

export default mongoose.models.RecurringExpense || mongoose.model('RecurringExpense', RecurringExpenseSchema)


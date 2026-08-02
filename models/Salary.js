import mongoose from 'mongoose'

const SalarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR'],
    },
    frequency: {
      type: String,
      enum: ['monthly', 'bi-weekly', 'weekly', 'yearly'],
      default: 'monthly',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null, // null means ongoing
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      default: null,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
SalarySchema.index({ userId: 1, isActive: 1 })
SalarySchema.index({ userId: 1, startDate: 1, endDate: 1 })

export default mongoose.models.Salary || mongoose.model('Salary', SalarySchema)


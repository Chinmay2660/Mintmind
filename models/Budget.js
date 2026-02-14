import mongoose from 'mongoose'

const BudgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
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
    period: {
      type: String,
      enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
      required: true,
      default: 'monthly',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
BudgetSchema.index({ userId: 1, categoryId: 1, isActive: 1 })
BudgetSchema.index({ userId: 1, startDate: 1, endDate: 1 })

export default mongoose.models.Budget || mongoose.model('Budget', BudgetSchema)


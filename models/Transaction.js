import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['expense', 'income', 'transfer'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  transferToAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
  },
  transferToIsCash: {
    type: Boolean,
    default: false,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
  },
  isCash: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);


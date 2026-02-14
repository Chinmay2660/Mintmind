import mongoose from 'mongoose';

const BankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  bankName: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
  },
  accountType: {
    type: String,
    enum: ['Savings', 'Current', 'Credit Card', 'Other'],
    default: 'Savings',
  },
  balance: {
    type: Number,
    default: 0,
    required: true,
  },
  color: {
    type: String,
    default: '#4845d2',
  },
  icon: {
    type: String,
    default: '🏦',
  },
}, {
  timestamps: true,
});

export default mongoose.models.BankAccount || mongoose.model('BankAccount', BankAccountSchema);


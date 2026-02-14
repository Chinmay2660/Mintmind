import mongoose from 'mongoose';

const InvestmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['FD', 'Mutual Fund', 'Stock', 'Other'],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  investedDate: {
    type: Date,
    required: true,
  },
  maturityDate: {
    type: Date,
  },
  maturityType: {
    type: String,
    enum: ['Payout', 'Reinvestment', 'Maturity', 'Ongoing'],
    default: 'Ongoing',
  },
  currentValue: {
    type: Number,
  },
  interestRate: {
    type: Number,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Investment || mongoose.model('Investment', InvestmentSchema);


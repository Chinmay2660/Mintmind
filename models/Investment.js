import mongoose from 'mongoose';

const InvestmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['FD', 'Mutual Fund', 'Stock', 'Gold', 'Gold ETF', 'EPF', 'EPS', 'Other'],
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
  schemeCode: { type: String },
  amc: { type: String },
  units: { type: Number, min: 0 },
  purchaseNav: { type: Number, min: 0 },
  currentNav: { type: Number, min: 0 },
  navDate: { type: Date },
  sipAmount: { type: Number, min: 0 },
  assetClass: { type: String, enum: ['equity', 'debt', 'gold', 'cash', 'other'], default: 'other' },
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
}, {
  timestamps: true,
});

export default mongoose.models.Investment || mongoose.model('Investment', InvestmentSchema);


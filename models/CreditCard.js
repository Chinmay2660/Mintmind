import mongoose from 'mongoose';

const CreditCardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cardName: {
    type: String,
    required: true,
  },
  issuer: {
    type: String,
  },
  cardNumber: {
    type: String,
  },
  cardType: {
    type: String,
    enum: ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Other'],
  },
  lastFourDigits: {
    type: String,
    maxlength: 4,
  },
  creditLimit: {
    type: Number,
    required: true,
  },
  currentBalance: {
    type: Number,
    default: 0,
  },
  statementDay: {
    type: Number,
    min: 1,
    max: 31,
  },
  dueDay: {
    type: Number,
    min: 1,
    max: 31,
  },
  apr: {
    type: Number,
  },
  rewardsProgram: {
    type: String,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
  },
  notes: {
    type: String,
  },
  color: {
    type: String,
    default: '#7c3aed',
  },
}, {
  timestamps: true,
});

export default mongoose.models.CreditCard || mongoose.model('CreditCard', CreditCardSchema);

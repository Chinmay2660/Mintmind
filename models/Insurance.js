import mongoose from 'mongoose';

const InsuranceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['Life', 'Health', 'Motor', 'Home', 'Other'],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  policyNumber: {
    type: String,
  },
  premium: {
    type: Number,
    required: true,
  },
  premiumFrequency: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Yearly'],
    default: 'Yearly',
  },
  startDate: {
    type: Date,
    required: true,
  },
  renewalDate: {
    type: Date,
  },
  coverageAmount: {
    type: Number,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Insurance || mongoose.model('Insurance', InsuranceSchema);
